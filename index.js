const AWS = require('aws-sdk');
const moment = require('moment');
const Slack = require('@slack/client');

const DynamoDB = new AWS.DynamoDB.DocumentClient();

const log = data => console.log(data) || data;

const shouldRunPairings = cohort => (
  cohort.slackChannel &&
  cohort.pairSchedule.some(scheduledDay => scheduledDay === moment().day())
);

const findStudentsByCohort = cohort => new Promise((resolve, reject) => {
  DynamoDB.query({
    TableName: 'students',
    IndexName: 'cohort-index',
    KeyConditionExpression: '#cohortId = :cohortId',
    ExpressionAttributeNames: {
      '#cohortId': 'cohortId',
    },
    ExpressionAttributeValues: {
      ':cohortId': cohort.id,
    },
  }, (error, data) => {
    if (error) {
      reject(error);
    } else {
      resolve(data.Items);
    }
  })
}).then(students => students.filter(student => student.isActive));

const calculatePairingIndex = (cohort) => {
  const now = moment();
  const weeksSinceStart = now.diff(cohort.startDate, 'weeks');
  const pairingsPerWeek = cohort.pairSchedule.length;
  const pairingsCompletedThisWeek = cohort.pairSchedule.sort().indexOf(now.day());

  return weeksSinceStart * pairingsPerWeek + pairingsCompletedThisWeek;
};

const rotateArray = (array) => {
  const item = array.pop();
  array.unshift(item);
}

const pairStudentsInCohort = cohort => Promise.all([
  findStudentsByCohort(cohort),
  Promise.resolve(calculatePairingIndex(cohort)),
])
  .then(([students, currentLessonIndex]) => {
    const rotations = currentLessonIndex % students.length;

    for (let i = 0; i < rotations; i += 1) {
      rotateArray(students);
    }

    const studentPairs = students.splice(0, students.length / 2);

    const pairs = students.map((student, i) => ({
      pair1: `${student.firstName} ${student.lastName[0]}`,
      pair2: (studentPairs[studentPairs.length - 1 - i] ? `${studentPairs[studentPairs.length - 1 - i].firstName} ${studentPairs[studentPairs.length - 1 - i].lastName[0]}` : 'Han Solo'),
    }));

    return {
      pairs,
      slackChannel: cohort.slackChannel,
    };
  });

const formatPairs = pairs => `:pear::pear::pear:
\`\`\`
${pairs.map(({ pair1, pair2 }) => `${pair1} - ${pair2}`).join('\n')}
\`\`\``;

const sendSlackNotification = (cohort) => {
  const slack = new Slack.WebClient(process.env.SLACK_AUTH_TOKEN);
  slack.chat.postMessage({
    channel: `#${cohort.slackChannel}`,
    icon_emoji: ':robot_face:',
    username: 'Pair-o-matic 5000',
    text: formatPairs(cohort.pairs),
  })
  .catch(log);
}

const pairBot = () => new Promise((resolve, reject) => {
  DynamoDB.scan({
    TableName: 'cohorts',
    FilterExpression: '#isActive = :isActive',
    ExpressionAttributeNames: {
      '#isActive': 'isActive',
    },
    ExpressionAttributeValues: {
      ':isActive': true,
    },
  }, (error, data) => {
    if (error) {
      reject(error);
    } else {
      resolve(data.Items);
    }
  })
})
  .then(cohorts => cohorts.filter(shouldRunPairings))
  .then(cohorts => Promise.all(cohorts.map(pairStudentsInCohort)))
  .then((cohorts) => {
    cohorts.forEach(sendSlackNotification);
  })
  .catch(log);

exports.handler = pairBot;
