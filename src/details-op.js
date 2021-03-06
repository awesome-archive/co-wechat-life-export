const controlMap = require('./control-map.js');
const saveMedia = require('./save-media.js');
const getShareLink = require('./get-share-link.js');
const locationObj = require('./get-location-image');
const getSomeCanSee = require('./get-some-can-see.js');
const constant = require('./constant.js');
const utils = require('./utils.js');
const db = require('./save-to-db.js');
const transformDate = require('./transform-date.js');

// 滚动到顶部
function scrollToFirstRow() {
  const firstChild = id(controlMap.detailsWrapper)
    .findOnce()
    .children()
    .get(0);
  if (firstChild.row() !== 0) {
    scrollUp();
    sleep(500);
    scrollToFirstRow();
  }
}

function backToList(lifeType) {
  if (lifeType === 'media') {
    back();
    waitForActivity('com.tencent.mm.plugin.sns.ui.SnsGalleryUI');
  }
  back();
  waitForActivity('com.tencent.mm.plugin.sns.ui.SnsUserUI');
}

module.exports = (extInfo) => {
  let lifeType = '';
  // 判断是否图片浏览界面
  const countWrapper = id(controlMap.countWrapper).findOnce();
  if (countWrapper) {
    // console.log('当前是图片/视频浏览界面');
    // 是图片浏览界面，需要点击才能进入详情界面
    countWrapper.click();
    waitForActivity('com.tencent.mm.plugin.sns.ui.SnsCommentDetailUI');
    lifeType = 'media';
  }

  sleep(2000);

  // 有可能先公开后设置私密，提示会在底部
  const privateSee = text('私密照片不能评论').findOnce();
  let isPrivateSee = false;
  if (privateSee) {
    isPrivateSee = true;
    console.log('当前内容仅自己可见');
  }

  scrollToFirstRow();

  const dateText = id(controlMap.dateText).findOnce();
  if (!dateText) {
    toastLog('找不到日期控件');
    throw new Error('找不到日期控件');
  }

  const dateTextString = dateText.text();
  const transformDateRes = transformDate(dateTextString);
  console.log('时间：==', dateTextString, '==', transformDateRes);

  if (transformDateRes < extInfo.filterLifeStartTime
    || transformDateRes > extInfo.filterLifeEndTime) {
    if (transformDateRes < extInfo.filterLifeStartTime) {
      return {
        isFinish: true,
      };
    }
    backToList(lifeType);
    return {};
  }

  // 保证能够截图到地址
  const localtionText = id(controlMap.locationText).findOnce();
  if (
    localtionText
    && (localtionText.bounds().top > device.height
    || localtionText.bounds().height() < 0
    || localtionText.bounds().height() === 0)
  ) {
    scrollUp();
    sleep(500);
  }

  const failText = id(controlMap.failText).findOnce();
  if (failText) {
    db.insert({
      row: extInfo.row,
      createdAt: new Date().getTime(),
    });
    backToList(lifeType);
    return {};
  }

  // 开始获取数据
  console.log('===================================>>');
  const shareComment = id(controlMap.shareComment).findOnce();
  let shareCommentString = '';
  if (shareComment) {
    shareCommentString = shareComment.text();
    console.log('文字内容：', shareCommentString);
  }
  const shareText = id(controlMap.shareText).findOnce();
  let shareTextString = '';
  if (shareText) {
    shareTextString = shareText.text();
    console.log('分享名称：', shareTextString);
  }

  // 获取不到地点信息
  const locationImage = locationObj.get();
  // const locationTextCom = id(controlMap.locationText).findOnce();
  // let locationImage = '';
  // let locationDetail = '';
  // if (locationTextCom) {
  //   // 地点比较难获取
  //   // locationImage = locationTextCom.text();
  //   // console.log('地点：', locationTextCom.text());
  //   // 获取经纬度（需要借助谷歌地图com.google.android.apps.maps）
  //   // locationDetail = getLocation();
  // }

  const fromText = id(controlMap.fromText).findOnce();
  let fromTextString = '';
  if (fromText) {
    fromTextString = fromText.text();
    console.log('来源：', fromText.text());
  }

  let shareLink = '';
  if (fromTextString !== '收藏') {
    // 点击进入分享内容详情
    if (shareText) {
      utils.superClick(shareText);
      shareLink = getShareLink();
    }
    if (shareLink) {
      console.log('分享链接地址：', shareLink);
    }
  }

  const someCanSee = getSomeCanSee();
  if (someCanSee) {
    console.log('当前内容限制了可见性');
  }

  const pictureFileNameList = saveMedia.savePicture();
  if (pictureFileNameList.length) {
    console.log('保存图片的文件名为：', pictureFileNameList);
    // 移动文件
    files.ensureDir(`${constant.appDir}/media/picture/`);
    pictureFileNameList.forEach((name) => {
      files.move(`${constant.wechatMediaDir}/${name}`, `${constant.appDir}/media/picture/${name}`);
    });
  }

  const videoFileName = saveMedia.saveVideo();
  if (videoFileName) {
    console.log('保存视频的文件名为：', videoFileName);
    files.ensureDir(`${constant.appDir}/media/video/`);
    files.move(
      `${constant.wechatMediaDir}/${videoFileName}`,
      `${constant.appDir}/media/video/${videoFileName}`,
    );
  }

  // 保存到数据库
  db.insert({
    row: extInfo.row,
    desc: shareCommentString,
    picture: pictureFileNameList.length ? pictureFileNameList.join(',') : '',
    video: videoFileName,
    shareTitle: shareTextString,
    shareLink,
    shareFrom: fromTextString,
    sendTime: transformDate(dateTextString),
    sendLocation: '',
    sendLocationShow: locationImage ? locationImage.fileName : '',
    sendLocationOcr: locationImage ? locationImage.ocrText : '',
    someCanSeeType: someCanSee ? someCanSee.type : '',
    someCanSeeList: someCanSee ? JSON.stringify(someCanSee.list) : '',
    isPrivate: isPrivateSee ? 1 : 0,
    createdAt: new Date().getTime(),
  });

  console.log('<<===================================');

  backToList(lifeType);
  return {};
};
