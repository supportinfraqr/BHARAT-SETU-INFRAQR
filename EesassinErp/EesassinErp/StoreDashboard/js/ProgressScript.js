window.addEventListener("DOMContentLoaded", () => {
      
    const elements = [].slice.call(document.querySelectorAll(".pie"));
    const circle = new CircularProgressBar("pie");

    if ("IntersectionObserver" in window) {
        const config = {
            root: null,
            rootMargin: "0px",
            threshold: 0.75
        };
        const ovserver = new IntersectionObserver((entries, observer) => {
            entries.map((entry) => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.75) {
                    circle.initial(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, config);
        elements.map((item) => {
            ovserver.observe(item);
        });
    } else {
        elements.map((element) => {
            circle.initial(element);
        });
    }
    setInterval(() => {
        const typeFont = [100, 200, 300, 400, 500, 600, 700];
        const colorHex = `#${Math.floor((Math.random() * 0xffffff) << 0).toString(
            16
        )}`;
        const options = {
            index: 17,
            percent: Math.floor(Math.random() * 100 + 1),
            colorSlice: colorHex,
            fontColor: colorHex,
            fontSize: `${Math.floor(Math.random() * (1.4 - 1 + 1) + 1)}rem`,
            fontWeight: typeFont[Math.floor(Math.random() * typeFont.length)]
        };
        circle.animationTo(options);
    }, 3000);
});