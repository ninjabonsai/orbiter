(function(){
    var isTouchDevice = 'ontouchstart' in document.documentElement;

    window.requestAnimFrame = (function(){
        return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            function( callback ){
                window.setTimeout(callback, 1000 / 60);
            };
    })();

    // constructor
    function Orbiter() {
        this.init();
    }

    // shortcut to reference prototypes
    var p = Orbiter.prototype;

    var that;

    var wasZoom = false;

    var canvas, ctx, planetsArray, sun, len, currentScale = 1, scaleDiff = 0;

    var w = window.innerWidth;
    var h = window.innerHeight;

    var halfW = w / 2;
    var halfH = h / 2;

    // public method
    p.init = function () {
        that = this;

        planetsArray = [];

        canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        canvas.width = w;
        canvas.height = h;
        //                canvas.style.backgroundColor = '#000';

        if (isTouchDevice) {
            canvas.addEventListener("touchstart", touchEvent);
            canvas.addEventListener("touchend", touchEvent);
            canvas.addEventListener("gesturechange", touchEvent);
            canvas.addEventListener("gestureend", touchEvent);
        }
        else {
            canvas.addEventListener("mousewheel", mouseEvent);
            canvas.addEventListener("click", mouseEvent);
        }

        ctx = canvas.getContext("2d");

        scaleCanvas(canvas, ctx);

        // sun
        sun = new Planet(0, 0, 10, {r: 255, g: 255, b: 0}, 1, 400);
        sun.vx = 0;
        sun.vy = 0;
        planetsArray.push(sun);

        renderItem(sun);

        var count = (window.innerWidth <= 1024) ? 40 : 200;

        // planets
        for (var i = 0; i < count; i++) {
            createPlanet(Math.random() * w - w / 2 | 0, Math.random() * h - h / 2 | 0);
        }

        len = planetsArray.length;

        tick();

        window.addEventListener("resize", resizeEvent);
    }

    function touchEvent(e) {
        switch (e.type) {
            case "gesturechange" :
                currentScale = e.scale + scaleDiff * e.scale;

                limitScale();
                wasZoom = true;
                break;
            case "gestureend" :
                scaleDiff = currentScale - 1;
                break;
            case "touchstart" :
                e.preventDefault();
                wasZoom = false;
                break;
            case "touchend" :
                if (!wasZoom) {
                    planetBurst(e.changedTouches[0].pageX, e.changedTouches[0].pageY);
                }
                break;
            default :
            //
        }
    }

    function mouseEvent(e) {
        e.preventDefault();

        if (e.type == "mousewheel") {
            currentScale += e.wheelDelta / 1000;

            limitScale();
            return;
        }

        planetBurst(e.pageX, e.pageY);
    }

    function planetBurst(xPos, yPos) {
        for (var i = 0; i < 20; i++) {
            createPlanet((xPos - w / 2) / currentScale + Math.random() * 80 - 40, (yPos - h / 2) / currentScale + Math.random() * 80 - 40);
        }

        len = planetsArray.length;
    }

    function limitScale() {
        currentScale = Math.max(.1, currentScale);
        currentScale = Math.min(5, currentScale);
    }

    function createPlanet(xPos, yPos) {
        var ranGreen = Math.random() * 255 | 0;
        var ranBlue = Math.random() * 255 | 0;
        var ranAlpha = Math.random();

        var b = new Planet(xPos, yPos, Math.random() * 6 | 0, {r: 0, g: ranGreen, b: ranBlue}, 1);
        planetsArray.push(b);
    }

    function resizeEvent(e) {
        w = window.innerWidth;
        h = window.innerHeight;

        halfW = w / 2;
        halfH = h / 2;

        canvas.width = w;
        canvas.height = h;

        scaleCanvas(canvas, ctx);
    }

    function tick() {
        //                ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "rgba(0, 0, 0, .05)";
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.fill();

        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.beginPath();
        ctx.arc((halfW + sun.x * currentScale), (halfH + sun.y * currentScale), sun.r * currentScale, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();

        renderItem(sun);

        for (var i = 0; i < len; i++) {
            var p = planetsArray[i];

            if (p.mass == 0) {
                planetsArray.splice(i, 1);
                i--;
                len--;
                continue;
            }

            if (p != sun) {
                p.x += p.vx;
                p.y += p.vy;
                renderItem(p);
            }
            else {
                p.vx = 0;
                p.vy = 0;
            }

        }

        for (i = 0; i < len - 1; i++) {
            var partA = planetsArray[i];

            for (var j = i + 1; j < len; j++) {
                var partB = planetsArray[j];
                checkCollision(partA, partB);
                gravitate(partA, partB);
            }
        }

        requestAnimFrame(tick);
    }

    function gravitate(partA, partB) {
        var dx = partB.x - partA.x;
        var dy = partB.y - partA.y;
        var distSQ = dx * dx + dy * dy;

        var dist = Math.sqrt(distSQ);

        var force = partA.mass * partB.mass / distSQ;

        var ax = force * dx / dist;
        var ay = force * dy / dist;

        if (dist > (partA.r + partB.r)) {
            partA.vx += ax / partA.mass;
            partA.vy += ay / partA.mass;
            partB.vx -= ax / partB.mass;
            partB.vy -= ay / partB.mass;
        }
    }

    function checkCollision(partA, partB) {
        var dx = partB.x - partA.x;
        var dy = partB.y - partA.y;
        var distSQ = dx * dx + dy * dy;
        var dist = Math.sqrt(distSQ);

        var scaleAmount = .35;

        if (dist < partA.r + partB.r) {
            if (partA.mass > partB.mass) {
                if (partA != sun) {
                    averageColors(partA, partB);
                }
                else {
                    scaleAmount = .25;
                }

                partA.r =  partA.r + partB.r * scaleAmount;
                partA.mass += partB.mass;
                partB.mass = 0;
                partB.r = 0;
            }
            else {
                if (partB != sun) {
                    averageColors(partB, partA);
                }
                else {
                    scaleAmount = .25;
                }

                partB.r = partB.r + partA.r * scaleAmount;
                partB.mass += partA.mass;
                partA.mass = 0;
                partA.r = 0;
            }
        }
    }

    function averageColors(a, b) {
        var ratio = b.mass / a.mass;

        var r = (b.color.r - a.color.r) * (ratio / 2);
        var g = (b.color.g - a.color.g) * (ratio / 2);
        var b = (b.color.b - a.color.b) * (ratio / 2);

        a.color.r += r | 0;
        a.color.g += g | 0;
        a.color.b += b | 0;
    }

    function renderItem(item) {
        var xPoint = halfW + item.x * currentScale;
        var yPoint = halfH + item.y * currentScale;

        if (xPoint > w || xPoint < 0) {
            return;
        }

        if (yPoint > h || yPoint < 0) {
            return;
        }

        ctx.fillStyle = "rgba(" + item.color.r + ", " + item.color.g + ", " + item.color.b + ", " + item.alpha + ")";
        ctx.beginPath();
        ctx.arc(xPoint, yPoint, item.r * currentScale, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
    }

    //
    // PLANETS
    Planet.prototype.x = 0;
    Planet.prototype.y = 0;
    Planet.prototype.r = 10;
    Planet.prototype.mass = 1;
    Planet.prototype.vx = 0;
    Planet.prototype.vy = 0;

    Planet.prototype.color = {};
    Planet.prototype.alpha = 1;

    function Planet(x, y, r, color, alpha, mass) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.mass = mass || r * 2;
        this.vx = Math.random() * 4 - 2;
        this.vy = Math.random() * 4 - 2;
        this.color = color;
        this.alpha = alpha;
    }

    function scaleCanvas(canvas, ctx) {

        var devicePixelRatio = window.devicePixelRatio || 1,
            backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                ctx.mozBackingStorePixelRatio ||
                ctx.msBackingStorePixelRatio ||
                ctx.oBackingStorePixelRatio ||
                ctx.backingStorePixelRatio || 1;

        var ratio = devicePixelRatio / backingStoreRatio;

        var oldWidth = canvas.width;
        var oldHeight = canvas.height;

        canvas.width = oldWidth * ratio;
        canvas.height = oldHeight * ratio;

        canvas.style.width = oldWidth + 'px';
        canvas.style.height = oldHeight + 'px';

        // now scale the context to counter
        // the fact that we've manually scaled
        // our canvas element
        ctx.scale(ratio, ratio);
    }

    // instantiate Orbiter
    var orbiter = new Orbiter();
}());