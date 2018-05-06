# Pair-o-matic 5000 :robot: :pear:

Pairs students in a cohort

Deals with multiple cohorts
Only posts on scheduled days
Posts to designated slack channel

## Setup
- clone, install etc
- `.env` file with SLACK_AUTH_TOKEN
- `cohorts.json` file - an array of objects like this:
```json
{
  "id": 1,
  "name": "Cohort Name",
  "startDate": 1517788800000, // unix timestamp milliseconds
  "isActive": true,
  "pairSchedule": [1], // 0=sunday, 6=saturday
  "slackChannel": "slack-channel-name"
}
```

- `students.json` file - an array of objects like this:
```json
{
  "id": 1,
  "cohortId": 1,
  "firstName": "Student",
  "lastName": "McStudent",
  "isActive": true
}
```

## Running

- `node pairbot.js`

## Todo
- Run using lambda
- Store data in db instead of JSON files
