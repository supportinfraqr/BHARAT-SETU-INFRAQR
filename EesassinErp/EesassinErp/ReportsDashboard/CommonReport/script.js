
// <!-- REPORT PAGE 1: COMPLIANCE OVERVIEW -->

document.addEventListener('DOMContentLoaded', () => {
    const chartData = {
        chartFactory: [74, 45, 30],
        chartFinance: [60, 50, 35],
        chartLabour: [50, 70, 28],
        chartSecretarial: [40, 55, 20],
        chartEstablishment: [68, 48, 38],
        chartPayroll: [56, 66, 33]
    };

    const makeDatasets = (outer, middle, inner) => [
        { data: [outer, 100 - outer], backgroundColor: ['#E45D27', '#FFE2D5'], cutout: '70%' },
        { data: [middle, 100 - middle], backgroundColor: ['#8BC34A', '#E9F7EA'], cutout: '50%', radius: '70%' },
        { data: [inner, 100 - inner], backgroundColor: ['#FFC107', '#FFF6E0'], cutout: '30%', radius: '50%' }
    ];

    Object.entries(chartData).forEach(([id, vals]) => {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        new Chart(ctx, {
            type: 'doughnut',
            data: { datasets: makeDatasets(...vals) },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    });
});




// =============<!-- REPORT PAGE 3: Labour Compliance -->============


const ctx3 = document.getElementById('labourComplianceChart').getContext('2d');

const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman & Nicobar', 'Chandigarh', 'Dadra & Nagar Haveli', 'Daman & Diu',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

// Sample static data — can be dynamic later
const complianceData = states.map(() => Math.floor(Math.random() * 12) + 1);

// Alternate colors for readability
const colors = states.map((_, i) =>
    i % 2 === 0 ? '#E45D27' : '#F4844C'
);

new Chart(ctx3, {
    type: 'bar',
    data: {
        labels: states,
        datasets: [{
            label: 'No. of Documents',
            data: complianceData,
            backgroundColor: colors,
            borderRadius: 4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: '#555',
                    font: { size: 11 },
                    maxRotation: 80,
                    minRotation: 45
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 2,
                    color: '#555',
                    font: { size: 12 }
                },
                title: {
                    display: true,
                    text: 'No. of Documents',
                    color: '#333',
                    font: { size: 13, weight: 'bold' }
                }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => ` ${context.parsed.y} documents`
                }
            }
        }
    }
});







// =============<!-- REPORT PAGE 4: Factory Compliance -->============


const ctx4 = document.getElementById('factoryComplianceChart').getContext('2d');

const states4 = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman & Nicobar', 'Chandigarh', 'Dadra & Nagar Haveli', 'Daman & Diu',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

// Generate mock data for demo
const complianceData4 = states4.map(() => Math.floor(Math.random() * 12) + 1);

// Alternate bar colors
const colors4 = states4.map((_, i) => i % 2 === 0 ? '#E45D27' : '#F4844C');

new Chart(ctx4, {
    type: 'bar',
    data: {
        labels: states4,
        datasets: [{
            label: 'No. of Documents',
            data: complianceData4,
            backgroundColor: colors4,
            borderRadius: 4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: '#555',
                    font: { size: 11 },
                    maxRotation: 80,
                    minRotation: 45
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 2,
                    color: '#555',
                    font: { size: 12 }
                },
                title: {
                    display: true,
                    text: 'No. of Documents',
                    color: '#333',
                    font: { size: 13, weight: 'bold' }
                }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => ` ${context.parsed.y} documents`
                }
            }
        }
    }
});







// =============<!-- REPORT PAGE 5: Establishment Compliance -->============

const ctx5 = document.getElementById('establishmentComplianceChart').getContext('2d');

const states5 = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman & Nicobar', 'Chandigarh', 'Dadra & Nagar Haveli', 'Daman & Diu',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

// Dummy values for visual distribution
const complianceData5 = states5.map(() => Math.floor(Math.random() * 15) + 2);

// Alternating orange tones for bar colors
const colors5 = states5.map((_, i) => i % 2 === 0 ? '#E45D27' : '#F4844C');

new Chart(ctx5, {
    type: 'bar',
    data: {
        labels: states5,
        datasets: [{
            label: 'No. of Documents',
            data: complianceData5,
            backgroundColor: colors5,
            borderRadius: 4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: '#555',
                    font: { size: 11 },
                    maxRotation: 80,
                    minRotation: 45
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 2,
                    color: '#555',
                    font: { size: 12 }
                },
                title: {
                    display: true,
                    text: 'No. of Documents',
                    color: '#333',
                    font: { size: 13, weight: 'bold' }
                }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => ` ${context.parsed.y} documents`
                }
            }
        }
    }
});







// =============<!-- REPORT PAGE 6: Finance Compliance -->============

const ctx6 = document.getElementById('financeComplianceChart').getContext('2d');

const states6 = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman & Nicobar', 'Chandigarh', 'Dadra & Nagar Haveli', 'Daman & Diu',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

// Simulated random counts for visual uniformity
const complianceData6 = states6.map(() => Math.floor(Math.random() * 15) + 3);

// Alternate shades for visual variation
const colors6 = states6.map((_, i) => i % 2 === 0 ? '#E45D27' : '#F4844C');

new Chart(ctx6, {
    type: 'bar',
    data: {
        labels: states6,
        datasets: [{
            label: 'No. of Documents',
            data: complianceData6,
            backgroundColor: colors6,
            borderRadius: 4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: '#555',
                    font: { size: 11 },
                    maxRotation: 80,
                    minRotation: 45
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 2,
                    color: '#555',
                    font: { size: 12 }
                },
                title: {
                    display: true,
                    text: 'No. of Documents',
                    color: '#333',
                    font: { size: 13, weight: 'bold' }
                }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => ` ${context.parsed.y} documents`
                }
            }
        }
    }
});







// =============<!-- REPORT PAGE 7: License report -->============

const ctx7 = document.getElementById('licenseReportChart').getContext('2d');

const licenseNames = [
    'Factory License', 'Contract Labour', 'Shop & Establishment', 'Fire Safety', 'Pollution Control',
    'Trade License', 'Environmental Clearance', 'Boiler License', 'Building Plan Approval',
    'Electrical Safety', 'Weights & Measures', 'Municipal License', 'FSSAI', 'Labour Welfare',
    'Pharmaceutical License', 'Insurance Registration', 'Professional Tax'
];

const licenseCounts = licenseNames.map(() => Math.floor(Math.random() * 60) + 10);

const colors7 = licenseNames.map((_, i) => i % 2 === 0 ? '#E45D27' : '#F4844C');

new Chart(ctx7, {
    type: 'bar',
    data: {
        labels: licenseNames,
        datasets: [{
            label: 'No. of Licenses',
            data: licenseCounts,
            backgroundColor: colors7,
            borderRadius: 4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: '#555',
                    font: { size: 11 },
                    maxRotation: 80,
                    minRotation: 45
                },
                title: {
                    display: true,
                    text: 'License Type',
                    color: '#333',
                    font: { size: 13, weight: 'bold' }
                }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    color: '#555',
                    stepSize: 10
                },
                title: {
                    display: true,
                    text: 'No. of Licenses',
                    color: '#333',
                    font: { size: 13, weight: 'bold' }
                }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => ` ${context.parsed.y} licenses`
                }
            }
        }
    }
});




// =============<!-- REPORT PAGE 9: Notice & Inspection -->============

document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById("noticeInspectionChart").getContext("2d");

    new Chart(ctx, {
        type: "pie",
        data: {
            labels: [
                "Late Fee ₹3,200",
                "Fines ₹2,200",
                "Penalties ₹5,200",
                "Interest ₹4,100",
                "Other Professional Expenses ₹1,100"
            ],
            datasets: [{
                data: [3200, 2200, 5200, 4100, 1100],
                backgroundColor: [
                    "#FBB03B", // Late Fee
                    "#62C4A8", // Fines
                    "#E94B35", // Penalties
                    "#F178B6", // Interest
                    "#6C63FF"  // Other Professional Expenses
                ],
                borderWidth: 2,
                borderColor: "#fff",
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Hide default legend
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.label.split("₹")[0] + ": ₹" + context.formattedValue;
                        }
                    }
                },
                datalabels: {
                    color: "#333",
                    formatter: (value, ctx) => {
                        const label = ctx.chart.data.labels[ctx.dataIndex];
                        return label;
                    },
                    font: { size: 12, weight: "bold" },
                    anchor: "end",
                    align: "end",
                    offset: 8
                }
            },
            layout: { padding: 20 }
        },
        plugins: [ChartDataLabels]
    });
});





// =============<!-- REPORT PAGE 10: Litigation -->============

document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("litigationChart");
    if (!canvas) return; // safety check
    const ctx = canvas.getContext("2d");

    new Chart(ctx, {
        type: "pie",
        data: {
            labels: [
                "Legal Fee ₹8,000",
                "Settlement ₹5,000",
                "Penalty ₹3,500",
                "Court Cost ₹2,000",
                "Misc. Expenses ₹1,200"
            ],
            datasets: [{
                data: [8000, 5000, 3500, 2000, 1200],
                backgroundColor: [
                    "#FBB03B", // Legal Fee
                    "#62C4A8", // Settlement
                    "#E94B35", // Penalty
                    "#F178B6", // Court Cost
                    "#6C63FF"  // Misc. Expenses
                ],
                borderColor: "#fff",
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 20 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.label.split("₹")[0] + ": ₹" + context.formattedValue;
                        }
                    }
                },
                datalabels: {
                    color: "#333",
                    formatter: (value, ctx) => {
                        const label = ctx.chart.data.labels[ctx.dataIndex];
                        return label.split("₹")[0];
                    },
                    font: {
                        size: 12,
                        weight: "bold"
                    },
                    anchor: "end",
                    align: "end",
                    offset: 8
                }
            }
        },
        plugins: [ChartDataLabels]
    });
});