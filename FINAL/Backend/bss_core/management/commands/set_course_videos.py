"""Set specific YouTube video embeds on existing course lessons.

The original demo courses used YouTube *search* embeds
(``/embed?listType=search&list=...``), which no longer play. This command points
each lesson at a real, relevant video, matched by lesson title — so it fixes the
courses already present in a database without re-running the whole demo seed.
"""

from django.core.management.base import BaseCommand

# Lesson title -> YouTube video id. Keep in sync with DEMO_COURSES in
# seed_demo_accounts.py (which is the source of truth for fresh seeds).
VIDEOS = {
    "Why site safety matters": "Dhxf5mm7g1g",
    "Personal Protective Equipment (PPE)": "p_9hOqdw75o",
    "Working at height & fall protection": "g2PGCtJEZow",
    "Emergency response on site": "m7g3eGbJbAM",
    "Setting up UPI safely": "NKGy1g07rP4",
    "Sending money home securely": "w_ZUOSlFw5s",
    "Spotting scams and frauds": "hKVMYtEzR00",
    "Understanding modern mix ratios": "r3ZJVom-qt4",
    "Efficient bricklaying": "aqfp63d0VWY",
    "Waterproofing & curing": "zUdCVzk_woI",
    "Types of scaffolding": "IjVT7sPdyIk",
    "Harness and fall protection": "dbf4Yg0zjhA",
    "Pre-use inspection checklist": "lGg9F34PkDE",
}


class Command(BaseCommand):
    help = "Set correct YouTube embeds on existing course lessons, matched by title."

    def handle(self, *args, **options):
        from bss_core.models import CourseLesson

        updated = 0
        for title, video_id in VIDEOS.items():
            url = f"https://www.youtube.com/embed/{video_id}"
            updated += (CourseLesson.objects
                        .filter(title=title)
                        .exclude(youtube_url=url)
                        .update(youtube_url=url))
        self.stdout.write(self.style.SUCCESS(f"Course videos updated: {updated} lesson(s)."))
