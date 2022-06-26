import * as THREE from 'https://unpkg.com/three/build/three.module.js';

let pixels = {};
let MAP_SIZE;
let scene;
let precision = 2;

export function clearPixels() {
    pixels = [];
}

export function getPixels() {
    return pixels;
}

export function setMapSize(mapSize) {
    MAP_SIZE = mapSize;
}

export function setPrecision(newPrecision) {
    precision = newPrecision
}

export function getPrecision() {
    return precision
}

export function setScene(scn) {
    scene = scn;
}

export function drawPixel(vector, size, color, opacity) {
    if (size === undefined) {
        size = 1;
    }

    let dotGeometry = new THREE.BoxGeometry(size, size, size);

    if (color === undefined) {
        color = new THREE.Color(Math.random() * 0xffffff);
    }

    if (opacity === undefined) {
        opacity = 1;
    }

    let vectorString = vector3ToString(vector);
    if (pixels.hasOwnProperty(vectorString)) {
        let foundPixel = pixels[vectorString];
        if (foundPixel.name === 'start' && foundPixel.name === 'end') {
            return;
        } else {
            scene.remove(foundPixel);
        }
    }

    let dotMaterial = new THREE.MeshLambertMaterial({color: color, transparent: true, opacity: opacity});
    let dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.position.set(vector.x, vector.y, vector.z);
    scene.add(dot);

    return dot;
}

export function vector3ToString(vector3) {
    return `${vector3.x}x${vector3.y}x${vector3.z}`;
}

export function rememberPixel(pixelVector, pixel) {
    pixels[vector3ToString(pixelVector)] = pixel;
}

export function randomPoint() {
    let min = - (MAP_SIZE / 2);
    let max = MAP_SIZE / 2;

    min = -10.00;
    max = 10;

    return (Math.random() * (max - min + 1.00) + min).toFixed(precision);
}

export function jumpDistance(vectorA, vectorB) {
    return vectorA.distanceTo(vectorB);
};

export function getRandomVector() {
    let y = -1
    while (y < 0) {
        y = randomPoint()
    }

    return new THREE.Vector3(
        randomPoint(),
        y,
        randomPoint()
    );
}

export function degToRad(input) {
    return input * (Math.PI / 180);
}

export function radToDeg(input) {
    return Math.round(input / (Math.PI / 180));
}
