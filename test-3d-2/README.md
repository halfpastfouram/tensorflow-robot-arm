### Three dimensions, again

Same as test-3d but only using tensorflow, not using reimprovejs.

## Problems

A common problem is when the actor moves into a corner. The actor might decide it wants to move out of the map and we
place it back. The actor has no idea how big the map is but it will receive a penalty. I might have to increase the 
penalty for moving outside of the map to avoid the actor from moving around the same spot for long periods of time. 
