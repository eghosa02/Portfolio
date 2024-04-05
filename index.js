function smoothScroll(target, duration) {
    var target = document.querySelector(target);
    var targetPosition = target.getBoundingClientRect().top;
    var startPosition = window.scrollY;
    var distance = targetPosition - startPosition;
    var startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        var timeElapsed = currentTime - startTime;
        var run = easing(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    function easing(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 *t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    requestAnimationFrame(animation);
}
function main()
{
    var homeLink = document.querySelector('nav ul a[href="#home"]');
    var aboutLink = document.querySelector('nav ul a[href="#about"]');
    var skillsLink = document.querySelector('nav ul a[href="#skills"]');
    var portfolioLink = document.querySelector('nav ul a[href="#portfolio"]');
    var contactLink = document.querySelector('nav ul a[href="#contact"]');
    
    homeLink.addEventListener('click', function() {
        smoothScroll('#home', 1000);
    });
    
    aboutLink.addEventListener('click', function() {
        smoothScroll('#about', 1000);
    });

    skillsLink.addEventListener('click', function() {
        smoothScroll('#skills', 1000);
    });
    
    portfolioLink.addEventListener('click', function() {
        smoothScroll('#portfolio', 1000);
    });
    
    contactLink.addEventListener('click', function() {
        smoothScroll('#contact', 1000);
    });
}


document.addEventListener('DOMContentLoaded', function() {
    main();
});