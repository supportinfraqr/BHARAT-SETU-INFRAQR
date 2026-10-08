"""Rozgar/course enrolment, lesson and certificate handlers."""

# ruff: noqa: F401,F403
from .common import *  # noqa: F401,F403


def _award_course_skill(user, course, certificate_no):
    """Add / verify a WorkerSkill (the certificate) when a course is completed."""
    from bss_core.models import WorkerSkill

    skill_name = (course.skill_name or course.title).strip()[:80]
    certification = (course.certification or course.title).strip()
    authority = (course.provider or "Bharat Shram Setu").strip()

    existing = WorkerSkill.objects.filter(user=user, name=skill_name).first()
    if existing is None:
        WorkerSkill.objects.create(
            user=user, name=skill_name, verified=True,
            certification_name=certification, certification_number=certificate_no,
            certification_authority=authority)
    else:
        existing.verified = True
        existing.certification_name = certification
        existing.certification_number = certificate_no
        existing.certification_authority = authority
        existing.save(update_fields=["verified", "certification_name",
                                     "certification_number", "certification_authority"])


def _course_state(course, enrollment):
    """Per-module and overall completion for a course enrollment."""
    completed_ids = {str(x) for x in (enrollment.completed_lesson_ids or [])}
    scores = {str(k): v for k, v in (enrollment.assignment_scores or {}).items()}
    total_items = done_items = 0
    modules = []
    for m in course.modules.all():
        lessons = list(m.lessons.all())
        assignments = list(m.assignments.all())
        lessons_done = all(str(l.id) in completed_ids for l in lessons) if lessons else True
        assignments_passed = all(
            scores.get(str(a.id)) is not None and scores[str(a.id)] >= a.pass_score
            for a in assignments) if assignments else True
        module_complete = bool(lessons or assignments) and lessons_done and assignments_passed
        total_items += len(lessons) + len(assignments)
        done_items += (sum(1 for l in lessons if str(l.id) in completed_ids)
                       + sum(1 for a in assignments if scores.get(str(a.id)) is not None
                             and scores[str(a.id)] >= a.pass_score))
        modules.append({
            "moduleId": str(m.id), "completed": module_complete,
            "lessonsDone": lessons_done, "assignmentsPassed": assignments_passed,
        })
    all_complete = bool(modules) and all(m["completed"] for m in modules)
    progress = 100 if enrollment.status == "COMPLETED" else (
        round(done_items / total_items * 100) if total_items else 0)
    return {
        "completedLessonIds": sorted(completed_ids, key=lambda x: int(x) if str(x).isdigit() else 0),
        "assignmentScores": scores,
        "modules": modules,
        "progress": progress,
        "allComplete": all_complete,
    }


def _course_summary(user, course, enrollment):
    state = _course_state(course, enrollment)
    return {
        "courseId": str(course.id),
        "completedLessonIds": state["completedLessonIds"],
        "assignmentScores": state["assignmentScores"],
        "assignmentFailedAt": enrollment.assignment_failed_at or {},
        "progress": state["progress"],
        "status": ("Completed" if enrollment.status == "COMPLETED"
                   else ("In progress" if state["progress"] > 0 else "Not started")),
        "certificateReady": enrollment.status == "COMPLETED",
        "certificateNo": enrollment.certificate_no,
        "skillAwarded": (course.skill_name or course.title) if enrollment.status == "COMPLETED" else "",
        "modules": state["modules"],
    }


def _grade_submission(submission, score, feedback, reviewer):
    """Grade a written/upload submission, sync the worker's assignment score and
    complete the course (issuing the certificate + skill) once everything passes.
    Returns ``(course, enrollment)``."""
    from bss_core.models import CourseEnrollment

    course = submission.assignment.module.course
    submission.score = _int_in_range(score, 0, 0, 100)
    submission.feedback = str(feedback or "")[:500]
    submission.status = "GRADED"
    submission.reviewer = reviewer
    submission.reviewed_at = timezone.now()
    submission.save(update_fields=["score", "feedback", "status", "reviewer", "reviewed_at"])

    enrollment, _ = CourseEnrollment.objects.get_or_create(worker=submission.worker, course=course)
    scores = {str(k): v for k, v in (enrollment.assignment_scores or {}).items()}
    scores[str(submission.assignment_id)] = submission.score
    enrollment.assignment_scores = scores
    enrollment.save(update_fields=["assignment_scores", "updated_at"])

    state = _course_state(course, enrollment)
    if state["allComplete"] and enrollment.status != "COMPLETED":
        enrollment.status = "COMPLETED"
        enrollment.certificate_issued = True
        if not enrollment.certificate_no:
            enrollment.certificate_no = f"BSS-CERT-{course.id}-{submission.worker_id}"
        enrollment.completed_at = timezone.now()
        enrollment.save(update_fields=["status", "certificate_issued", "certificate_no",
                                       "completed_at", "updated_at"])
        _award_course_skill(submission.worker, course, enrollment.certificate_no)
    return course, enrollment


def _handle_course_action(user, body):
    """Worker course progress: mark a lesson complete or submit an assignment.

    A module is complete when all its lessons are watched and all its
    assignments are passed; the course (and certificate) completes when every
    module is complete. The certificate is added to the worker's verified skills.
    """
    from bss_core.models import Course, CourseAssignment, CourseEnrollment

    raw_id = str(body.get("courseId") or "").replace("course-", "").strip()
    course = Course.objects.filter(pk=raw_id, is_active=True).first() if raw_id.isdigit() else None
    if course is None:
        raise PortalMutationError("Course not found.", 404)

    enrollment, _ = CourseEnrollment.objects.get_or_create(worker=user, course=course)
    action = str(body.get("action") or "").strip().lower().replace("_", "-")

    if action in ("complete-lesson", "lesson"):
        lesson_id = str(body.get("lessonId") or "")
        completed = {str(x) for x in (enrollment.completed_lesson_ids or [])}
        completed.add(lesson_id)
        enrollment.completed_lesson_ids = sorted(
            completed, key=lambda x: int(x) if str(x).isdigit() else 0)
        enrollment.save(update_fields=["completed_lesson_ids", "updated_at"])
    elif action in ("submit-assignment", "assignment", "submit-quiz", "quiz"):
        from bss_core.models import CourseSubmission

        assignment_id = str(body.get("assignmentId") or body.get("quizId") or "")
        assignment = (CourseAssignment.objects
                      .filter(pk=assignment_id, module__course=course).first()
                      if assignment_id.isdigit() else None)
        if assignment is None:
            raise PortalMutationError("Assignment not found.", 404)
        scores = {str(k): v for k, v in (enrollment.assignment_scores or {}).items()}

        if assignment.assignment_type == "QUIZ":
            from datetime import timedelta
            from django.utils import timezone

            failed_map = dict(enrollment.assignment_failed_at or {})
            last_failed_str = failed_map.get(str(assignment.id))
            if last_failed_str:
                try:
                    last_failed_time = timezone.datetime.fromisoformat(last_failed_str)
                    if timezone.is_naive(last_failed_time):
                        last_failed_time = timezone.make_aware(last_failed_time)
                    time_passed = timezone.now() - last_failed_time
                    if time_passed < timedelta(hours=8):
                        remaining_seconds = int((timedelta(hours=8) - time_passed).total_seconds())
                        hours_left = remaining_seconds // 3600
                        mins_left = (remaining_seconds % 3600) // 60
                        raise PortalMutationError(
                            f"Quiz cooldown active. You can retry this quiz in {hours_left}h {mins_left}m.", 429
                        )
                except PortalMutationError:
                    raise
                except Exception:
                    pass

            answers = body.get("answers") or {}
            questions = list(assignment.questions.all())
            correct = 0
            for question in questions:
                given = answers.get(str(question.id), answers.get(question.id))
                try:
                    if given is not None and int(given) == question.correct_index:
                        correct += 1
                except (TypeError, ValueError):
                    pass
            score = round(correct / len(questions) * 100) if questions else 100
            previous = scores.get(str(assignment.id))
            if previous is None or score > previous:
                scores[str(assignment.id)] = score
            enrollment.assignment_scores = scores
            enrollment.quiz_score = score
            
            # If worker failed to reach pass score, record failed timestamp for 8-hour cooldown
            if score < assignment.pass_score:
                failed_map[str(assignment.id)] = timezone.now().isoformat()
                enrollment.assignment_failed_at = failed_map
                enrollment.save(update_fields=["assignment_scores", "assignment_failed_at", "quiz_score", "updated_at"])
            else:
                # Passed! Remove any active cooldown entry for this quiz
                if str(assignment.id) in failed_map:
                    del failed_map[str(assignment.id)]
                    enrollment.assignment_failed_at = failed_map
                    enrollment.save(update_fields=["assignment_scores", "assignment_failed_at", "quiz_score", "updated_at"])
                else:
                    enrollment.save(update_fields=["assignment_scores", "quiz_score", "updated_at"])
        else:
            # Written / upload assignment — store the response. A reviewer can
            # grade it; until then it is accepted at the pass mark so the module
            # can complete.
            content = str(body.get("content") or "")[:5000]
            file_url = str(body.get("fileUrl") or "")[:255]
            if not content and not file_url:
                raise PortalMutationError("Add your response before submitting.", 400)
            submission, _ = CourseSubmission.objects.update_or_create(
                worker=user, assignment=assignment,
                defaults={"content": content, "file_url": file_url, "status": "SUBMITTED"})
            score = submission.score if submission.score is not None else assignment.pass_score
            previous = scores.get(str(assignment.id))
            if previous is None or score > previous:
                scores[str(assignment.id)] = score
            enrollment.assignment_scores = scores
            enrollment.save(update_fields=["assignment_scores", "updated_at"])
    elif action in ("grade-submission", "grade"):
        from bss_core.models import CourseSubmission

        if user.role not in ("contractor", "bss_staff", "bss_admin"):
            raise PortalMutationError("Only a reviewer can grade submissions.", 403)
        submission = CourseSubmission.objects.filter(pk=body.get("submissionId")).first()
        if submission is None:
            raise PortalMutationError("Submission not found.", 404)
        _, worker_enrollment = _grade_submission(
            submission, body.get("score"), body.get("feedback"), user)
        return {"submissionId": str(submission.id), "score": submission.score,
                "workerComplete": worker_enrollment.status == "COMPLETED"}
    else:
        raise PortalMutationError("Unknown course action.", 400)

    # Completion gate across all modules → issue the certificate.
    state = _course_state(course, enrollment)
    if state["allComplete"] and enrollment.status != "COMPLETED":
        enrollment.status = "COMPLETED"
        enrollment.certificate_issued = True
        if not enrollment.certificate_no:
            enrollment.certificate_no = f"BSS-CERT-{course.id}-{user.id}"
        enrollment.completed_at = timezone.now()
        enrollment.save(update_fields=["status", "certificate_issued", "certificate_no",
                                       "completed_at", "updated_at"])
        _award_course_skill(user, course, enrollment.certificate_no)

    return _course_summary(user, course, enrollment)


def _learning_config():
    from bss_core.models import LearningConfig
    return LearningConfig.objects.first() or LearningConfig.objects.create(courses_enabled=True)


def _admin_course_row(course):
    return {
        "id": course.id, "code": course.code, "title": course.title,
        "provider": course.provider, "category": course.category, "duration": course.duration,
        "description": course.description, "instructor": course.instructor,
        "certification": course.certification, "skillName": course.skill_name,
        "passScore": course.pass_score, "active": course.is_active, "sortOrder": course.sort_order,
        "modules": [{
            "id": m.id, "title": m.title,
            "lessons": [{"id": l.id, "title": l.title, "duration": l.duration,
                         "youtubeUrl": l.youtube_url} for l in m.lessons.all()],
            "readings": [{"id": r.id, "title": r.title, "body": r.body,
                          "resourceUrl": r.resource_url, "duration": r.duration}
                         for r in m.readings.all()],
            "assignments": [{
                "id": a.id, "title": a.title, "type": a.assignment_type,
                "instructions": a.instructions, "passScore": a.pass_score,
                "questions": [{"id": q.id, "question": q.question,
                               "options": list(q.options or []), "correctIndex": q.correct_index}
                              for q in a.questions.all()],
            } for a in m.assignments.all()],
        } for m in course.modules.all()],
    }


def _int_in_range(value, default, low, high):
    try:
        return max(low, min(high, int(value)))
    except (TypeError, ValueError):
        return default


def _write_course_modules(course, modules):
    """Id-aware upsert of a course's modules/lessons/readings/assignments/questions.

    Existing rows are updated in place (matched by the id the client sends) and
    only genuinely removed items are deleted — so editing a course does NOT wipe
    workers' assignment submissions (``CourseSubmission`` cascades from
    ``CourseAssignment``).
    """
    from bss_core.models import (CourseAssignment, CourseLesson, CourseModule,
                                 CourseQuestion, CourseReading)

    def _row_id(value):
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    existing_modules = {m.id: m for m in course.modules.all()}
    kept_modules = set()
    for i, m in enumerate(modules or []):
        m = m if isinstance(m, dict) else {}
        title = str(m.get("title") or "").strip()
        if not title:
            continue
        module = existing_modules.get(_row_id(m.get("id")))
        if module is None:
            module = CourseModule.objects.create(course=course, title=title[:160])
        module.title = title[:160]
        module.sort_order = i
        module.save(update_fields=["title", "sort_order"])
        kept_modules.add(module.id)

        existing = {x.id: x for x in module.lessons.all()}
        kept = set()
        for j, l in enumerate(m.get("lessons") or []):
            l = l if isinstance(l, dict) else {}
            ltitle = str(l.get("title") or "").strip()
            if not ltitle:
                continue
            lesson = existing.get(_row_id(l.get("id")))
            if lesson is None:
                lesson = CourseLesson.objects.create(course=course, module=module, title=ltitle[:160])
            lesson.title = ltitle[:160]
            lesson.duration = str(l.get("duration") or "")[:40]
            lesson.youtube_url = str(l.get("youtubeUrl") or "")[:255]
            lesson.sort_order = j
            lesson.save(update_fields=["title", "duration", "youtube_url", "sort_order"])
            kept.add(lesson.id)
        module.lessons.exclude(id__in=kept).delete()

        existing = {x.id: x for x in module.readings.all()}
        kept = set()
        for j, r in enumerate(m.get("readings") or []):
            r = r if isinstance(r, dict) else {}
            rtitle = str(r.get("title") or "").strip()
            if not rtitle:
                continue
            reading = existing.get(_row_id(r.get("id")))
            if reading is None:
                reading = CourseReading.objects.create(module=module, title=rtitle[:160])
            reading.title = rtitle[:160]
            reading.body = str(r.get("body") or "")
            reading.resource_url = str(r.get("resourceUrl") or "")[:255]
            reading.duration = str(r.get("duration") or "")[:40]
            reading.sort_order = j
            reading.save(update_fields=["title", "body", "resource_url", "duration", "sort_order"])
            kept.add(reading.id)
        module.readings.exclude(id__in=kept).delete()

        existing = {x.id: x for x in module.assignments.all()}
        kept = set()
        for j, a in enumerate(m.get("assignments") or []):
            a = a if isinstance(a, dict) else {}
            atitle = str(a.get("title") or "").strip()
            if not atitle:
                continue
            atype = str(a.get("type") or "QUIZ").upper()
            if atype not in ("QUIZ", "WRITING", "UPLOAD"):
                atype = "QUIZ"
            assignment = existing.get(_row_id(a.get("id")))
            if assignment is None:
                assignment = CourseAssignment.objects.create(module=module, title=atitle[:160])
            assignment.title = atitle[:160]
            assignment.assignment_type = atype
            assignment.instructions = str(a.get("instructions") or "")
            assignment.pass_score = _int_in_range(a.get("passScore"), 60, 0, 100)
            assignment.sort_order = j
            assignment.save(update_fields=["title", "assignment_type", "instructions",
                                           "pass_score", "sort_order"])
            kept.add(assignment.id)

            question_rows = a.get("questions") or [] if atype == "QUIZ" else []
            q_existing = {q.id: q for q in assignment.questions.all()}
            q_kept = set()
            for k, q in enumerate(question_rows):
                q = q if isinstance(q, dict) else {}
                qtext = str(q.get("question") or "").strip()
                options = [str(o)[:300] for o in (q.get("options") or []) if str(o).strip()]
                if not qtext or len(options) < 2:
                    continue
                question = q_existing.get(_row_id(q.get("id")))
                if question is None:
                    question = CourseQuestion.objects.create(
                        course=course, assignment=assignment, question=qtext[:300])
                question.question = qtext[:300]
                question.options = options
                question.correct_index = _int_in_range(q.get("correctIndex"), 0, 0, len(options) - 1)
                question.sort_order = k
                question.save(update_fields=["question", "options", "correct_index", "sort_order"])
                q_kept.add(question.id)
            assignment.questions.exclude(id__in=q_kept).delete()
        module.assignments.exclude(id__in=kept).delete()
    course.modules.all().exclude(id__in=kept_modules).delete()


def _is_bss_admin(user):
    return getattr(user, "role", "") in ("bss_admin", "admin")


@api_view(["GET", "PATCH"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_learning_config(request):
    """BSS Admin: read/toggle whether the courses & skills module is available."""
    from .admin_console import log_audit
    if not _is_bss_admin(request.user):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    cfg = _learning_config()
    if request.method == "PATCH":
        body = request.data if isinstance(request.data, dict) else {}
        if "coursesEnabled" in body:
            cfg.courses_enabled = bool(body.get("coursesEnabled"))
            cfg.save(update_fields=["courses_enabled", "updated_at"])
            log_audit(request.user, "UPDATE", "learning_config", cfg.id,
                      after={"summary": f"Courses {'enabled' if cfg.courses_enabled else 'disabled'}"})
    return Response({"data": {"coursesEnabled": cfg.courses_enabled}}, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_courses(request):
    """BSS Admin: list / create courses (the worker skills catalog)."""
    from bss_core.models import Course
    if not _is_bss_admin(request.user):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    if request.method == "POST":
        import secrets
        body = request.data if isinstance(request.data, dict) else {}
        title = str(body.get("title") or "").strip()
        if not title:
            return Response({"error": "Course title is required."}, status=status.HTTP_400_BAD_REQUEST)
        code = str(body.get("code") or "").strip() or f"CRS{secrets.token_hex(3).upper()}"
        course = Course.objects.create(
            code=code[:40], title=title[:160],
            provider=str(body.get("provider") or "Bharat Shram Setu")[:120],
            category=str(body.get("category") or "")[:80],
            duration=str(body.get("duration") or "")[:40],
            description=str(body.get("description") or "")[:1000],
            instructor=str(body.get("instructor") or "")[:120],
            certification=str(body.get("certification") or "")[:120],
            skill_name=str(body.get("skillName") or "")[:80],
            pass_score=int(body.get("passScore") or 70),
            is_active=bool(body.get("active", True)),
        )
        _write_course_modules(course, body.get("modules"))
        return Response({"data": _admin_course_row(course)}, status=status.HTTP_201_CREATED)
    rows = [_admin_course_row(c)
            for c in Course.objects.prefetch_related("modules__lessons")]
    return Response({"data": rows}, status=status.HTTP_200_OK)


@api_view(["PATCH", "DELETE"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_course_detail(request, course_id):
    from bss_core.models import Course
    if not _is_bss_admin(request.user):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    course = Course.objects.filter(pk=course_id).first()
    if course is None:
        return Response({"error": "Course not found."}, status=status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        course.delete()
        return Response({"ok": True}, status=status.HTTP_200_OK)
    body = request.data if isinstance(request.data, dict) else {}
    text_fields = [("title", "title", 160), ("provider", "provider", 120),
                   ("category", "category", 80), ("duration", "duration", 40),
                   ("description", "description", 1000), ("instructor", "instructor", 120),
                   ("certification", "certification", 120), ("skill_name", "skillName", 80)]
    for field, key, limit in text_fields:
        if key in body:
            setattr(course, field, str(body.get(key) or "")[:limit])
    if "passScore" in body:
        course.pass_score = max(0, min(100, int(body.get("passScore") or 0)))
    if "active" in body:
        course.is_active = bool(body.get("active"))
    course.save()
    if isinstance(body.get("modules"), list):
        _write_course_modules(course, body.get("modules"))
    return Response({"data": _admin_course_row(course)}, status=status.HTTP_200_OK)


def _admin_worker_label(user):
    return (user.get_full_name() or "").strip() or getattr(user, "username", "") or ""


@api_view(["GET"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_learning_report(request):
    """BSS Admin: skilling report — enrollments/progress plus assignment
    submissions awaiting grading (shown inside the Skilling page)."""
    from bss_core.models import CourseEnrollment, CourseSubmission
    if not _is_bss_admin(request.user):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)

    enrollments, completed = [], 0
    for e in (CourseEnrollment.objects.select_related("worker", "course")
              .order_by("-updated_at")[:300]):
        state = _course_state(e.course, e)
        if e.status == "COMPLETED":
            completed += 1
        enrollments.append({
            "id": e.id,
            "workerName": _admin_worker_label(e.worker),
            "workerId": getattr(e.worker, "username", ""),
            "course": e.course.title,
            "status": e.get_status_display(),
            "progress": state["progress"],
            "certificateNo": e.certificate_no,
            "completedAt": _dts(e.completed_at),
            "updatedAt": _dts(e.updated_at),
        })

    submissions, pending = [], 0
    for s in (CourseSubmission.objects
              .select_related("worker", "assignment__module__course")
              .order_by("-submitted_at")[:500]):
        if s.status == "SUBMITTED":
            pending += 1
        module = s.assignment.module
        submissions.append({
            "id": s.id,
            "workerName": _admin_worker_label(s.worker),
            "workerId": getattr(s.worker, "username", ""),
            "course": module.course.title,
            "module": module.title,
            "assignment": s.assignment.title,
            "type": s.assignment.assignment_type,
            "content": s.content,
            "fileUrl": s.file_url,
            "status": s.get_status_display(),
            "score": s.score,
            "feedback": s.feedback,
            "submittedAt": _dts(s.submitted_at),
        })

    return Response({"data": {
        "summary": {
            "enrollments": len(enrollments),
            "completed": completed,
            "submissions": len(submissions),
            "pendingGrading": pending,
        },
        "enrollments": enrollments,
        "submissions": submissions,
    }}, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@authentication_classes([BssSessionAuthentication])
@permission_classes([IsAuthenticated])
def admin_course_submission_grade(request, submission_id):
    """BSS Admin: grade a written/upload assignment submission."""
    from bss_core.models import CourseSubmission
    from .admin_console import log_audit
    if not _is_bss_admin(request.user):
        return Response({"error": "BSS Admin only."}, status=status.HTTP_403_FORBIDDEN)
    submission = (CourseSubmission.objects
                  .select_related("worker", "assignment__module__course")
                  .filter(pk=submission_id).first())
    if submission is None:
        return Response({"error": "Submission not found."}, status=status.HTTP_404_NOT_FOUND)
    body = request.data if isinstance(request.data, dict) else {}
    _, enrollment = _grade_submission(
        submission, body.get("score"), body.get("feedback"), request.user)
    log_audit(request.user, "UPDATE", "course_submission", submission.id,
              after={"summary": (f"Graded {submission.assignment.title} for "
                                 f"{_admin_worker_label(submission.worker)}: {submission.score}%")})
    return Response({"data": {
        "submissionId": submission.id, "score": submission.score,
        "status": submission.get_status_display(),
        "workerComplete": enrollment.status == "COMPLETED",
    }}, status=status.HTTP_200_OK)


__all__ = [
    "_award_course_skill",
    "_course_state",
    "_course_summary",
    "_grade_submission",
    "_handle_course_action",
    "_learning_config",
    "admin_learning_config",
    "admin_courses",
    "admin_course_detail",
    "admin_learning_report",
    "admin_course_submission_grade",
]
