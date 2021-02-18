# AI for a 6-axis robot arm

So I've build A 6-axis robot arm with lego's EV3 bricks and servos. Now I need software to control it. To move the tip of the arm to the desired location
I want to just specify the point in a tridimensional space within the arm's reach. An AI should do all the hard work for
me.

## The start

I've designed a really simple version of my 6-axis arm that I could use to train a model using Tensorflow.js. My goal is
 to teach the model to rotate all available axes to reach the desired point. 

### Baby steps 

See [test-2d/test.html](test-2d/test.html).

My first test is a 2d map of 10x10 squares. I will try to teach a model the to find the quickest route from point A to
point B by rewarding every step based on the distance between the new position and point B. 

### One more dimension

See [test-3d/test.html](test-3d/test.html).

My second test adds another dimension. I now have a 3d map of 10x10x10 points. I will try to teach a model the to find
the quickest route from point A to point B by rewarding every step based on the distance between the new position and
point B using the same reward system as the first test.

### Next level

Later on, I will try to teach a model how to rotate axis after axis of the 3d model I've created to reach for a certain
point.


