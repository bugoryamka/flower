let segments = 10; // Number of segments in the chain
let baseSegmentLength = 50; // Base length of each segment
let points = []; // Points representing the chain
let targets = []; // Target positions for the chain
let colors = ['#FF61A5', '#2FB2FF']; // Pink and Blue

// Second-order system variables for the sun
let sunPos;
let sunVel;
let sunAcc;
let damping = 0.6; // Damping factor to reduce oscillations
let stiffness = 0.4; // Stiffness of the spring-like motion

// Slider variable
let distanceSlider;

// Variables for sun and background effects
let sunColor;
let rayLength;
let bgColorTop, bgColorBottom;

// Gradient colors for different times of the day
let morningTop, morningBottom, afternoonTop, afternoonBottom, eveningTop, eveningBottom, nightTop, nightBottom;

// Audio element
let audio;
let startButton;

function setup() {
  // Create a responsive canvas
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.style('max-width', '100%');
  canvas.style('height', 'auto');

  // Initialize gradient colors
  morningTop = color(255, 223, 186); // Light orange
  morningBottom = color(255, 255, 255); // White
  afternoonTop = color(135, 206, 250); // Light blue
  afternoonBottom = color(255, 255, 255); // White
  eveningTop = color(255, 165, 0); // Orange
  eveningBottom = color(75, 0, 130); // Purple
  nightTop = color(0, 0, 100); // Dark blue
  nightBottom = color(0, 0, 25); // Darker blue

  // Initialize points in a straight line
  for (let i = 0; i < segments; i++) {
    points.push(createVector(i * baseSegmentLength, height / 2));
  }
  // Initialize targets at the same positions as points
  targets = points.slice();
  // Initialize sun position at the last point of the chain
  sunPos = points[points.length - 1].copy(); // Sun starts at the last link's position
  sunVel = createVector(0, 0); // Initialize sun velocity
  sunAcc = createVector(0, 0); // Initialize sun acceleration

  // Create a slider
  distanceSlider = createSlider(50, 200, 50);
  distanceSlider.position(20, height - 50); // Position slider at the bottom

  // Initialize sun and background variables
  sunColor = color('#FFEB3B'); // Yellow color for the sun
  rayLength = 30; // Initial length of sun rays
  bgColorTop = morningTop; // Start with morning gradient
  bgColorBottom = morningBottom;

  // Get the audio element and start button
  audio = document.getElementById('audio');
  startButton = document.getElementById('startButton');

  // Start the sketch when the button is clicked
  startButton.addEventListener('click', () => {
    startButton.style.display = 'none'; // Hide the button
    audio.play(); // Play the audio
    loop(); // Start the p5.js draw loop
  });

  noLoop(); // Pause the draw loop until the button is clicked
}

function draw() {
  // Update background gradient based on sun position
  updateBackground();
  // Update the sun's position using a second-order system
  updateSun();
  // Constrain the sun and flower to the canvas
  constrainToCanvas();
  // Update the target to follow the sun
  targets[targets.length - 1] = sunPos.copy();
  // Apply FABRIK algorithm
  fabrik();
  // Draw the elements in the correct order
  drawLeaves(); // Draw leaves first (bottom layer)
  drawStem(); // Draw stem next
  drawPetals(points[points.length - 1].x, points[points.length - 1].y, '#FF61A5'); // Draw petals
  drawFlower(); // Draw flower heart last (top layer)
  drawSun(); // Draw the sun
}

function updateBackground() {
  // Map the sun's Y position to a time-of-day progression (0 to 1)
  let timeOfDay = map(sunPos.y, 0, height, 0, 1);

  // Smoothly transition between gradients based on time of day
  if (timeOfDay < 0.25) {
    // Morning to afternoon
    bgColorTop = lerpColor(morningTop, afternoonTop, timeOfDay * 4);
    bgColorBottom = lerpColor(morningBottom, afternoonBottom, timeOfDay * 4);
  } else if (timeOfDay < 0.5) {
    // Afternoon to evening
    bgColorTop = lerpColor(afternoonTop, eveningTop, (timeOfDay - 0.25) * 4);
    bgColorBottom = lerpColor(afternoonBottom, eveningBottom, (timeOfDay - 0.25) * 4);
  } else if (timeOfDay < 0.75) {
    // Evening to night
    bgColorTop = lerpColor(eveningTop, nightTop, (timeOfDay - 0.5) * 4);
    bgColorBottom = lerpColor(eveningBottom, nightBottom, (timeOfDay - 0.5) * 4);
  } else {
    // Night
    bgColorTop = nightTop;
    bgColorBottom = nightBottom;
  }

  // Draw the background gradient
  setGradient(0, 0, width, height, bgColorTop, bgColorBottom);
}

function setGradient(x, y, w, h, c1, c2) {
  // Draw a vertical gradient
  noFill();
  for (let i = y; i <= y + h; i++) {
    let inter = map(i, y, y + h, 0, 1);
    let c = lerpColor(c1, c2, inter);
    stroke(c);
    line(x, i, x + w, i);
  }
}

function updateSun() {
  // Calculate the force to move the sun toward the mouse or touch
  let targetPos;
  if (touches.length > 0) {
    // Use touch position on mobile
    targetPos = createVector(touches[0].x, touches[0].y);
  } else {
    // Use mouse position on desktop
    targetPos = createVector(mouseX, mouseY);
  }
  let force = p5.Vector.sub(targetPos, sunPos).mult(stiffness);
  // Apply the force to the sun's acceleration
  sunAcc.add(force);
  // Update the sun's velocity and position
  sunVel.add(sunAcc);
  sunVel.mult(damping); // Apply damping to reduce oscillations
  sunPos.add(sunVel);
  // Reset acceleration
  sunAcc.mult(0);
}

function constrainToCanvas() {
  // Constrain the sun to the canvas boundaries
  sunPos.x = constrain(sunPos.x, 0, width);
  sunPos.y = constrain(sunPos.y, 0, height);

  // Constrain the flower to the canvas boundaries
  points[points.length - 1].x = constrain(points[points.length - 1].x, 0, width);
  points[points.length - 1].y = constrain(points[points.length - 1].y, 0, height);
}

function drawSun() {
  // Determine if the sun is at the bottom (nighttime)
  let sunYNormalized = map(sunPos.y, 0, height, 0, 1);
  let isNight = sunYNormalized > 0.75; // Nighttime when sun is in the bottom 25%

  // Update sun color and ray length based on position
  if (isNight) {
    // Sun turns white and rays shrink to zero
    sunColor = lerpColor(color('#FFEB3B'), color(255, 255, 255), (sunYNormalized - 0.75) * 4); // Yellow to white
    rayLength = lerp(30, 0, (sunYNormalized - 0.75) * 4); // Rays shrink to zero

    // Add a glow effect at night
    let glowSize = lerp(50, 100, (sunYNormalized - 0.75) * 4); // Glow size increases
    let glowAlpha = lerp(0, 100, (sunYNormalized - 0.75) * 4); // Glow opacity increases
    noStroke();
    fill(255, 255, 255, glowAlpha); // White glow with transparency
    ellipse(sunPos.x, sunPos.y, glowSize, glowSize); // Glow
  } else {
    // Sun is yellow and rays are normal
    sunColor = color('#FFEB3B');
    rayLength = 30;
  }

  // Draw the sun
  fill(sunColor);
  noStroke();
  ellipse(sunPos.x, sunPos.y, 50, 50); // Sun

  // Draw sun rays (if rayLength > 0)
  if (rayLength > 0) {
    stroke(sunColor);
    strokeWeight(3);
    let numRays = 12; // Number of rays
    for (let i = 0; i < numRays; i++) {
      let angle = (TWO_PI / numRays) * i; // Evenly space rays
      let startX = sunPos.x + cos(angle) * 25; // Start of the ray
      let startY = sunPos.y + sin(angle) * 25;
      let endX = sunPos.x + cos(angle) * (25 + rayLength); // End of the ray
      let endY = sunPos.y + sin(angle) * (25 + rayLength);
      line(startX, startY, endX, endY); // Draw the ray
    }
  }
}

function fabrik() {
  // Forward reaching
  points[points.length - 1] = targets[targets.length - 1].copy();
  for (let i = points.length - 2; i >= 0; i--) {
    let dir = p5.Vector.sub(points[i], points[i + 1]);
    let stretchFactor = dist(sunPos.x, sunPos.y, width / 2, height - 50) / (segments * baseSegmentLength);
    dir.setMag(baseSegmentLength * stretchFactor); // Adjust segment length based on stretch
    points[i] = p5.Vector.add(points[i + 1], dir);
  }
  // Backward reaching
  points[0] = createVector(width / 2, height - 50); // Fixed base at the bottom
  for (let i = 1; i < points.length; i++) {
    let dir = p5.Vector.sub(points[i], points[i - 1]);
    let stretchFactor = dist(sunPos.x, sunPos.y, width / 2, height - 50) / (segments * baseSegmentLength);
    dir.setMag(baseSegmentLength * stretchFactor); // Adjust segment length based on stretch
    points[i] = p5.Vector.add(points[i - 1], dir);
  }

  // Adjust the distance between the last and penultimate link based on the slider value
  let lastLink = points[points.length - 1];
  let penultimateLink = points[points.length - 2];
  let desiredDistance = distanceSlider.value();
  let currentDistance = p5.Vector.dist(lastLink, penultimateLink);
  if (currentDistance > 0) {
    let adjustment = p5.Vector.sub(lastLink, penultimateLink).mult((desiredDistance - currentDistance) / currentDistance);
    penultimateLink.add(adjustment);
  }
}

function drawFlower() {
  // Draw the flower's heart at the end of the stem
  fill('#FF61A5'); // Pink color for the flower
  noStroke();
  ellipse(points[points.length - 1].x, points[points.length - 1].y, 60, 60); // Flower head
  // Draw flower center
  fill('#FFD700'); // Gold color for the center
  ellipse(points[points.length - 1].x, points[points.length - 1].y, 30, 30); // Flower center
}

function drawPetals(x, y, color) {
  // Draw petals around a given position (x, y)
  fill(color); // Color for the petals
  noStroke();
  let numPetals = 8; // Number of petals
  let petalSize = 30; // Size of each petal
  for (let i = 0; i < numPetals; i++) {
    let angle = (TWO_PI / numPetals) * i; // Evenly space petals
    let petalX = x + cos(angle) * 40; // Position petals around the center
    let petalY = y + sin(angle) * 40;
    ellipse(petalX, petalY, petalSize, petalSize); // Draw each petal
  }
}

function drawLeaves() {
  // Draw leaves along the stem
  fill('#34A853'); // Green color for the leaves
  noStroke();
  for (let i = 1; i < points.length - 1; i += 2) {
    let midPoint = p5.Vector.lerp(points[i], points[i + 1], 0.5);
    // Draw leaves on alternating sides of the stem
    if (i % 4 === 1) {
      ellipse(midPoint.x + 15, midPoint.y, 20, 10); // Leaf on the right
    } else {
      ellipse(midPoint.x - 15, midPoint.y, 20, 10); // Leaf on the left
    }
  }
}

function drawStem() {
  // Draw the stem (rope), but skip the last link
  strokeWeight(10);
  for (let i = 0; i < points.length - 1; i++) { // Stop before the last link
    stroke(colors[i % colors.length]);
    line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
  }
}

function windowResized() {
  // Resize the canvas when the window is resized
  resizeCanvas(windowWidth, windowHeight);
}
