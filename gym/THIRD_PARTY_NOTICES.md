# Third-party notices: FitTrack Gym

FitTrack Gym's data comes from [openGym](https://github.com/DuarteSantos8/openGym) by Duarte Santos
(imported from commit `e4a68a94`). openGym's own code is AGPL-3.0. FitTrack Gym uses **none of
openGym's code** and imports only the parts of openGym that are under the MIT licence, as openGym's
`NOTICE.md` lists them:

| File | What it holds | Origin and licence |
|---|---|---|
| `data/exercises.js` | 1,323 exercises: name, body part, equipment, category, target and secondary muscles, instructions | ExerciseDB v1 by AscendAPI, via [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset), as carried in openGym's catalogue (`"textSource": "exercisedb"`). MIT, see below. |
| `data/body-paths.js` | SVG outlines of the front and back body diagrams | [MuscleMap](https://github.com/melihcolpan/MuscleMap) by Melih Colpan, as converted by openGym. MIT, see below. |

**Left out on purpose:**

- **Exercise images and animations.** openGym licenses these from Gym visual for openGym only.
  They may not be copied out of openGym, so FitTrack Gym has none.
- **openGym's descriptions, muscle-map corrections, translations and newer exercises.** These are
  AGPL-3.0. Including them would put FitTrack Gym under the AGPL.

The muscle mapping, workout logger, routines and the rest of the app were written for FitTrack Gym.
Run `gym/tools/import_opengym.py` to regenerate the data from a newer openGym checkout.

---

## exercises-dataset (exercise text)

```
MIT License

Copyright (c) 2026 Hasan Emir Yıldırım

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation and data files (the "Software"),
to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## MuscleMap (body diagram)

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
