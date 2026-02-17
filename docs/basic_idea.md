# Project: Solar System Music Sequencer
Why? Because music + astronomy = cool

## Basics
This web app will be a tool to create music by placing planets around a star. Each planet is a sound (e.g., square wave).  You can place satellites around each planet that trigger the sound

### The Players

* Star = sets the overall tempo.  mass of the star = ?
* Planet = base sound (e.g., saw wave, poly synth) and modulation?
* Satellite = note and duration- closer to the planet, the faster it plays.  16th note is close, whole note is farther away.  size of planet = volume of note 
* Comet - one off sound.  Triggers when it gets close to a planet or the star? size is volume.  If it collids with a planet it breaks up into satellites for that planet.

The satellite of one planet can get pulled into orbit of another.  Same with comets.  If they start to orbit, they keep their sound but trigger 


#### Rotation
Each planet's day is the local tempo. Maybe this has something to do with time signature too?

#### Revolution
I don't know what this will do but it seems like it should do something. Just to fuck with gravity of astroids and comets? Seems like it should have an impact on the music

## Modes
### Sync
Press a button to sync up the rotation speeds of each planet to the star.  Basically a reset so eveything plays together nicely

### Random
Press a button to randomize the rotation speeds of each planet.

### Space dust
Press a button to add random satellites at random vectors.  these can become comets (pick a random sound) or end up orbit planets

## Saving and Loading
At any point in time you can download a json file with the setup of your solar system that you can then load back in at a later date.  

## Tech Specs
I want to be able to host this on vercel and use reliable, modern javascript frameworks.  
The code should always have at least 80% code coverage and use tools like precommit to run tests, perform linting, etc.

