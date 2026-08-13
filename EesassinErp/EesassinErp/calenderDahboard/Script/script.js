document.addEventListener("DOMContentLoaded", () => {
    const calendarHeader = document.getElementById("calendar-header");
    const calendarTable = document.getElementById("calendar-table");

    if (!calendarHeader || !calendarTable) {
        console.error("❌ calendar-header or calendar-table not found in the DOM!");
        return;
    }

    let currentDate = new Date();
    let currentMonth = currentDate.getMonth(); // Dynamically get the current month
    let currentYear = currentDate.getFullYear(); // Get the current year

    const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();

    const renderCalendar = () => {
        // Update calendar header with month & year
        calendarHeader.textContent = new Date(currentYear, currentMonth).toLocaleString("en-US", {
            month: "long",
            year: "numeric",
        });

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const totalDays = daysInMonth(currentMonth, currentYear);

        let tableHTML = "<tr>";

        // Empty <td> for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            tableHTML += "<td></td>";
        }

        // Add days to the calendar
        for (let day = 1; day <= totalDays; day++) {
            tableHTML += `<td>${day}</td>`;
            if ((firstDay + day) % 7 === 0) {
                tableHTML += "</tr><tr>"; // New row for a new week
            }
        }

        tableHTML += "</tr>"; // Close the last row

        calendarTable.innerHTML =
            `<tr>
                <th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th>
            </tr>` +
            tableHTML;
    };

    const prevMonth = () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    };

    const nextMonth = () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    };

    renderCalendar(); // Initial render

    // Attach event listeners to buttons if they exist
    const prevButton = document.getElementById("prev-month");
    const nextButton = document.getElementById("next-month");

    if (prevButton) prevButton.addEventListener("click", prevMonth);
    if (nextButton) nextButton.addEventListener("click", nextMonth);
});
