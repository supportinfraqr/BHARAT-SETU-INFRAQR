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
        submission.score = max(0, min(100, int(body.get("score") or 0)))
        submission.feedback = str(body.get("feedback") or "")[:500]
        submission.status = "GRADED"
        submission.reviewer = user
        submission.reviewed_at = timezone.now()
        submission.save(update_fields=["score", "feedback", "status", "reviewer", "reviewed_at"])
        worker_enrollment, _ = CourseEnrollment.objects.get_or_create(
            worker=submission.worker, course=course)
        sc = {str(k): v for k, v in (worker_enrollment.assignment_scores or {}).items()}
        sc[str(submission.assignment_id)] = submission.score
        worker_enrollment.assignment_scores = sc
        worker_enrollment.save(update_fields=["assignment_scores", "updated_at"])
        state = _course_state(course, worker_enrollment)
        if state["allComplete"] and worker_enrollment.status != "COMPLETED":
            worker_enrollment.status = "COMPLETED"
            worker_enrollment.certificate_issued = True
            if not worker_enrollment.certificate_no:
                worker_enrollment.certificate_no = f"BSS-CERT-{course.id}-{submission.worker_id}"
            worker_enrollment.completed_at = timezone.now()
            worker_enrollment.save(update_fields=["status", "certificate_issued", "certificate_no",
                                                  "completed_at", "updated_at"])
            _award_course_skill(submission.worker, course, worker_enrollment.certificate_no)
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


__all__ = [
    "_award_course_skill",
    "_course_state",
    "_course_summary",
    "_handle_course_action",
]
