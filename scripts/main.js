(function () {
    var isTouchDevice = 'ontouchstart' in document.documentElement;

    window.requestAnimFrame = (function () {
        return  window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
    })();

    // constructor
    function Orbiter() {
        this.init();
    }

    // shortcut to reference prototypes
    var p = Orbiter.prototype;

    var wasZoom = false;

    var canvas, ctx, planetsArray, sun, len, currentScale = 1, scaleDiff = 0;

    var w = window.innerWidth;
    var h = window.innerHeight;

    var halfW = w / 2;
    var halfH = h / 2;

    // public method
    p.init = function () {
        planetsArray = [];

        canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.style.backgroundColor = '#000';
        document.body.appendChild(canvas);

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
        sun = new Planet(0, 0, 10, [255, 255, 0], 1, 400);
        sun.vx = 0;
        sun.vy = 0;
        planetsArray.push(sun);

        renderItem(sun);

        // planets
        planetBurst({xPos: w / 4, yPos: h / 4}, true);

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
                    var pos = {xPos: e.changedTouches[0].pageX, yPos: e.changedTouches[0].pageY};

                    pos.xPos -= w / 2;
                    pos.yPos -= h / 2;

                    planetBurst(pos);
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

        var pos = {xPos: e.pageX, yPos: e.pageY};

        pos.xPos -= w / 2;
        pos.yPos -= h / 2;

        planetBurst(pos);
    }

    function planetBurst(pos, spiralFromSun) {
        var l = Math.random() * 70 | 0 + 30;

        if (spiralFromSun) {
            l = 90;
        }

        pos.xPos /= currentScale;
        pos.yPos /= currentScale;

        var dist = Math.sqrt(pos.xPos * pos.xPos + pos.yPos * pos.yPos);

        var angle = Math.atan2(pos.yPos, pos.xPos);

        if (dist < sun.r * 8) {
            dist = sun.r * 8;
        }

        for (var i = 0; i < l; i++) {
            var ranGreen = Math.random() * 255 | 0;
            var ranBlue = Math.random() * 255 | 0;
            var ranMass = Math.random() * 6 | 0;

            var orbitData;

            if (spiralFromSun) {
                orbitData = getSteadyOrbit(angle + Math.PI * 4 / l * i, sun.r * 2 + (dist / l * i));
            } else {
                orbitData = getSteadyOrbit(angle + Math.PI * 4 / l * i, dist + dist / l * i);
            }

            callCreatePlanet(orbitData, i, ranGreen, ranBlue, ranMass);
        }
    }

    function callCreatePlanet(orbitData, i, ranGreen, ranBlue, ranMass) {
        setTimeout(function () {
            createPlanet(orbitData.xPos, orbitData.yPos, ranGreen, ranBlue, ranMass, orbitData.vx, orbitData.vy);
        }, i * 50);
    }

    function getSteadyOrbit(angle, distance) {
        var xPos = Math.cos(angle) * distance,
            yPos = Math.sin(angle) * distance;

        var totalDistance = Math.abs(xPos) + Math.abs(yPos);

        var df = distance / 1500;

        var speed = 2.5;

        // apply velocity values that should result in a clockwise orbit around the sun
        var vx = yPos / totalDistance * -(speed - df * speed),
            vy = xPos / totalDistance * (speed - df * speed);

        return {xPos: xPos, yPos: yPos, vx: vx, vy: vy};
    }

    function limitScale() {
        currentScale = Math.max(.1, currentScale);
        currentScale = Math.min(5, currentScale);
    }

    function createPlanet(xPos, yPos, ranGreen, ranBlue, ranMass, ranVx, ranVy) {
        var b = new Planet(xPos, yPos, ranMass, [0, ranGreen, ranBlue], 1, ranMass, ranVx, ranVy);
        planetsArray.push(b);

        len++;
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

        ctx.beginPath();
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
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

                partA.r = partA.r + partB.r * scaleAmount;
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

        var r = (b.color[0] - a.color[0]) * (ratio / 2);
        var g = (b.color[1] - a.color[1]) * (ratio / 2);
        var b = (b.color[2] - a.color[2]) * (ratio / 2);

        a.color[0] += r | 0;
        a.color[1] += g | 0;
        a.color[2] += b | 0;
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

        ctx.beginPath();
        ctx.fillStyle = "rgba(" + item.color[0] + ", " + item.color[1] + ", " + item.color[2] + ", " + item.alpha + ")";
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

    Planet.prototype.color = [];
    Planet.prototype.alpha = 1;

    function Planet(x, y, r, color, alpha, mass, vx, vy) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.color = color;
        this.alpha = alpha;
        this.mass = mass || r * 2;
        this.vx = vx;
        this.vy = vy;
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