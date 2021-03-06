const constant = require('./constant.js');

function numberPadding(n) {
  if ((`${n}`).length < 2) {
    return `0${n}`;
  }
  return n;
}

const dateFormat = (timestamp) => {
  const date = new Date(parseInt(timestamp, 10));
  return `${date.getFullYear()}/${numberPadding(date.getMonth() + 1)}/${numberPadding(date.getDate())} ${numberPadding(date.getHours())}:${numberPadding(date.getMinutes())}`;
};

const dbWrapper = (() => {
  // console.log('打开/创建数据库实例');
  const db = sqlite.open(
    `${constant.appDir}/data.db`,
    { version: 1 },
    {
      onOpen(dbInstant) {
        dbInstant.execSQL(
          // eslint-disable-next-line no-multi-str
          '\
        CREATE TABLE IF NOT EXISTS wechatLife(\
          `id` INTEGER PRIMARY KEY AUTOINCREMENT,\
          `row` INTEGER NOT NULL,\
          `desc` TEXT,\
          `picture` TEXT,\
          `video` TEXT,\
          `shareTitle` TEXT,\
          `shareLink` TEXT,\
          `shareFrom` TEXT,\
          `sendTime` TEXT,\
          `sendLocation` TEXT,\
          `sendLocationShow` TEXT,\
          `sendLocationOcr` TEXT,\
          `someCanSeeType` TEXT,\
          `someCanSeeList` TEXT,\
          `isPrivate` INTEGER,\
          `runSeq` INTEGER,\
          `createdAt` TEXT\
        )\
      ',
        );
      },
    },
  );
  // 获取 runSeq，进行递增
  const maxRunSeq = db.rawQuery('SELECT MAX(runSeq) as maxRunSeq FROM wechatLife', null).single().maxRunSeq;
  let currentRunSeq;
  if (!Number.isNaN(maxRunSeq) && maxRunSeq) {
    currentRunSeq = parseInt(maxRunSeq, 10) + 1;
  } else {
    currentRunSeq = 1;
  }
  return {
    getDB() {
      return db;
    },
    insert(data) {
      // const insertResult = db.insert('wechatLife', {
      //   row: 1,
      //   desc: '测试测试',
      //   picture: '["a.png", "b.png"]',
      //   video: 'c.mp4',
      //   shareTitle: '测试链接标题',
      //   shareLink: 'https://e12e.com',
      //   shareFrom: 'co',
      //   sendTime: '2019年5月10日',
      //   sendLocation: '珠海',
      //   sendLocationShow: 'd.png',
      //   isSomeCanSee: 1,
      //   isPrivate: 0,
      //   createdAt: '0000000000'
      // });
      // eslint-disable-next-line no-param-reassign
      data.runSeq = currentRunSeq;
      console.info('将要插入：\n', data);
      const insertResult = db.insert('wechatLife', data);
      console.log('insertResult：', insertResult);
    },
    getHistory() {
      const cursor = db.rawQuery('SELECT MIN(sendTime) as lifeStartTime,MAX(sendTime) as lifeEndTime,MIN(createdAt) as runStartTime,MAX(createdAt) as runEndTime,runSeq,COUNT(runSeq) as lifeCount  FROM wechatLife GROUP BY runSeq', null);
      const resultList = [];
      while (cursor.moveToNext()) {
        const res = cursor.pick();
        resultList.push({
          runSeq: res.runSeq,
          lifeStartTime: dateFormat(res.lifeStartTime),
          lifeEndTime: dateFormat(res.lifeEndTime),
          runStartTime: dateFormat(res.runStartTime),
          runEndTime: dateFormat(res.runEndTime),
          lifeCount: res.lifeCount,
        });
      }
      // 记得关闭cursor
      cursor.close();
      return resultList;
    },
    deleteHistory(runSeq) {
      const res = db.delete('wechatLife', 'runSeq = ?', [runSeq]);
      console.log('删除结果：', res);
      return res;
    },
    close() {
      db.close();
    },
  };
})();

module.exports = dbWrapper;

// const insertResult = dbWrapper.insert({
//   row: 1,
//   desc: '测试测试',
//   picture: '["a.png", "b.png"]',
//   video: 'c.mp4',
//   shareTitle: '测试链接标题',
//   shareLink: 'https://e12e.com',
//   shareFrom: 'co',
//   sendTime: '2019年5月10日',
//   sendLocation: '珠海',
//   sendLocationShow: 'd.png',
//   isSomeCanSee: 1,
//   isPrivate: 0,
//   createdAt: '0000000000'
// });
