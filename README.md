# FitTrack Pro - Nutrition & Fitness Tracker

## Overview
A comprehensive fitness tracking application similar to MyFitnessPal, built as a progressive web app (PWA) with offline capabilities.

## Features

### Core Features
1. **Food Diary** - Log meals with calorie and macro tracking
2. **Exercise Tracker** - Record workouts and calories burned
3. **Barcode Scanner** - Quick food entry via barcode
4. **Recipe Builder** - Create and save custom recipes
5. **Progress Tracking** - Weight, measurements, and photo progress
6. **Water Tracker** - Daily hydration monitoring
7. **Meal Planning** - Plan meals for the week
8. **Reports & Insights** - Weekly/monthly nutrition analysis

### Technical Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: LocalStorage + IndexedDB for offline support
- **PWA**: Service Worker for offline functionality
- **Charts**: Chart.js for data visualization
- **Icons**: Font Awesome

## Data Structure

### User Profile
- Goal weight, current weight, height, age, gender
- Activity level
- Daily calorie goal (auto-calculated or custom)
- Macro targets (protein, carbs, fat)

### Food Database
- USDA food database integration
- Custom food entries
- Recent/frequent foods
- Barcode lookup

### Daily Log
- Breakfast, lunch, dinner, snacks
- Each entry: food name, serving size, calories, macros
- Exercise entries
- Water intake

## Screens
1. Dashboard - Daily summary and quick actions
2. Diary - Food and exercise logging
3. Progress - Charts and measurements
4. Recipes - Custom recipe builder
5. Profile - Settings and goals
6. Reports - Analytics and insights

## Monetization
- Free: Basic tracking, limited history
- Premium: $9.99/mo - Unlimited history, advanced reports, meal plans, export data
