# FitTrack Gym

A gym workout tracker that sits alongside FitTrack Pro. It uses the exercise library and muscle-map
artwork from [openGym](https://github.com/DuarteSantos8/openGym).

Open `gym/index.html` in a browser, or tap **Workouts** in FitTrack Pro's bottom bar. It needs no
build step or server, and works straight from disk or from any static host such as GitHub Pages.

## Features

- **Exercise library:** 1,323 exercises with step-by-step instructions. Search them, filter by
  body part or equipment, or tap a muscle on the body diagram to see exercises that target it.
- **Muscle maps:** every exercise shows its target and secondary muscles on a front and back body
  diagram, with a male or female figure.
- **Workout logger:** log weight and reps (or seconds or metres) per set, see what you lifted last
  time, and run a rest timer after each completed set.
- **Routines:** build a routine once and start it in one tap, or save a finished workout as one.
- **History:** duration, volume, sets and calories for each workout, plus your best estimated 1RM
  for each exercise.
- **Weekly heat map:** shows which muscles you trained in the last 7 days.
- **Works with FitTrack Pro:** each finished workout adds its estimated calories to the
  **Exercise** total in FitTrack Pro's diary.
- **Settings:** switch between kg and lb, set your body weight and rest timer, and export your data
  as JSON.

## How it works

| File | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app: vanilla JavaScript, no dependencies apart from Font Awesome icons |
| `data/exercises.js`, `data/body-paths.js` | Data generated from openGym. Don't edit these by hand |
| `tools/import_opengym.py` | Regenerates `data/` from an openGym checkout |
| `THIRD_PARTY_NOTICES.md` | Sources and licences for the data |

Everything is stored in the browser's `localStorage`:

- `fittrack_gym_v1` holds settings, routines, workout history and the workout in progress.
- `fittrack_exercise_<date>` holds the calorie entries that FitTrack Pro reads. Deleting a workout
  in FitTrack Gym removes its entry.

Calories are estimated as MET 5.0 (general weight training) × body weight × duration.

To update the exercise data:

```sh
git clone --depth 1 https://github.com/DuarteSantos8/openGym /tmp/opengym
python3 gym/tools/import_opengym.py /tmp/opengym
```

## Licensing

FitTrack Gym uses none of openGym's code, which is AGPL-3.0. It imports only openGym's
MIT-licensed data: the original ExerciseDB exercise text and the MuscleMap body outlines. It
leaves out openGym's exercise images and animations, which are licensed to openGym alone. It also
leaves out openGym's own AGPL-licensed descriptions and translations. Full details and licence
texts are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
