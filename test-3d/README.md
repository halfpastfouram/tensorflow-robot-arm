### Three dimensions

Using [THREE.js](https://threejs.org) I am plotting a 10 by 10 by 10 grid.
Every round a two random points are plotted: point A and point B.

Every round an actor will move one step in any direction and receive a reward when it moves closer to point B or a
penalty when it moves further from point B.

All steps by the actor are plotted as a small cube and the reward for that step is represented by a color.

## Problems

A common problem is when the actor moves into a corner. The actor might decide it wants to move out of the map and we
place it back. The actor has no idea how big the map is but it will receive a penalty. I might have to increase the 
penalty for moving outside of the map to avoid the actor from moving around the same spot for long periods of time.
Given enough time, the actor will recover and eventually reach the target. I might take a humongous amount of steps,
though. 

Because hit is one of my first ML projects I've used a library that makes it easier to setup a RL system. That library
is unfortunately no longer under active development so I'm going to have to move to something else.
