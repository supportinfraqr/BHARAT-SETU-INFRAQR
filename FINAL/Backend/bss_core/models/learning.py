"""Learning / skilling: courses -> modules -> (video lessons + assignments).

A course is split into modules. Each module has video lessons and one or more
assignments (quizzes) with their own pass marks. A worker completes every lesson
and passes every assignment; when the whole course is done a certificate is
issued and a verified WorkerSkill is added to the worker's profile.
"""

from django.db import models

from .auth import User


class LearningConfig(models.Model):
    """Global learning/skilling settings — BSS Admin controls whether the
    courses & skills module is available to workers."""

    courses_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "learning_config"

    def __str__(self):
        return f"courses_enabled={self.courses_enabled}"


class Course(models.Model):
    code = models.CharField(max_length=40, unique=True)
    title = models.CharField(max_length=160)
    provider = models.CharField(max_length=120, blank=True)
    category = models.CharField(max_length=80, blank=True)
    duration = models.CharField(max_length=40, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=4.5)
    description = models.CharField(max_length=1000, blank=True)
    instructor = models.CharField(max_length=120, blank=True)
    certification = models.CharField(max_length=120, blank=True)
    # Skill added to the worker's profile when the course is completed.
    skill_name = models.CharField(max_length=80, blank=True)
    image_url = models.CharField(max_length=255, blank=True)
    badge = models.CharField(max_length=80, blank=True)
    pass_score = models.PositiveIntegerField(default=70)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.title


class CourseModule(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="modules")
    title = models.CharField(max_length=160)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "course_module"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.course_id}:{self.title}"


class CourseLesson(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE, null=True, blank=True,
                               related_name="lessons")
    title = models.CharField(max_length=160)
    duration = models.CharField(max_length=40, blank=True)
    youtube_url = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "course_lesson"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.course_id}:{self.title}"


class CourseAssignment(models.Model):
    """A module-level assignment with its own pass mark. An assignment can be a
    quiz (auto-graded), a written response or a file upload — all must reach the
    pass mark for the module to complete."""

    TYPE = [("QUIZ", "Quiz"), ("WRITING", "Written response"), ("UPLOAD", "File upload")]

    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE, related_name="assignments")
    title = models.CharField(max_length=160)
    assignment_type = models.CharField(max_length=20, choices=TYPE, default="QUIZ")
    instructions = models.TextField(blank=True)
    pass_score = models.PositiveIntegerField(default=60)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "course_assignment"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.module_id}:{self.title}"


class CourseSubmission(models.Model):
    """A worker's response to a non-quiz assignment (written / upload)."""

    STATUS = [("SUBMITTED", "Submitted"), ("GRADED", "Graded"), ("RETURNED", "Returned")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="course_submissions")
    assignment = models.ForeignKey(CourseAssignment, on_delete=models.CASCADE, related_name="submissions")
    content = models.TextField(blank=True)
    file_url = models.CharField(max_length=255, blank=True)
    score = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="SUBMITTED")
    feedback = models.CharField(max_length=500, blank=True)
    reviewer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "course_submission"
        constraints = [
            models.UniqueConstraint(fields=["worker", "assignment"], name="uq_course_submission"),
        ]

    def __str__(self):
        return f"{self.worker_id}:{self.assignment_id} ({self.status})"


class CourseReading(models.Model):
    """Supplementary reading material for a module (article text and/or a link).
    Admin-managed; shown alongside the module's videos and assignments."""

    module = models.ForeignKey(CourseModule, on_delete=models.CASCADE, related_name="readings")
    title = models.CharField(max_length=160)
    body = models.TextField(blank=True)
    resource_url = models.CharField(max_length=255, blank=True)
    duration = models.CharField(max_length=40, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "course_reading"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.module_id}:{self.title}"


class CourseQuestion(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="questions")
    assignment = models.ForeignKey(CourseAssignment, on_delete=models.CASCADE, null=True, blank=True,
                                   related_name="questions")
    question = models.CharField(max_length=300)
    options = models.JSONField(default=list)
    correct_index = models.PositiveIntegerField(default=0)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "course_question"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.question


class CourseEnrollment(models.Model):
    STATUS = [("IN_PROGRESS", "In progress"), ("COMPLETED", "Completed")]

    worker = models.ForeignKey(User, on_delete=models.CASCADE, related_name="course_enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    completed_lesson_ids = models.JSONField(default=list, blank=True)
    # {assignment_id (str): best score %} — an assignment is passed when the score
    # reaches its pass mark.
    assignment_scores = models.JSONField(default=dict, blank=True)
    # {assignment_id (str): ISO timestamp string of last failed attempt}
    assignment_failed_at = models.JSONField(default=dict, blank=True)
    quiz_score = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="IN_PROGRESS")
    certificate_issued = models.BooleanField(default=False)
    certificate_no = models.CharField(max_length=60, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "course_enrollment"
        constraints = [
            models.UniqueConstraint(fields=["worker", "course"], name="uq_course_enrollment"),
        ]

    def __str__(self):
        return f"{self.worker_id}:{self.course_id} ({self.status})"
