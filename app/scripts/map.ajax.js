/*global $ AMap*/
'use strict';
var position, apiHost = 'http://120.132.57.114/',
  type = {
    weather: 'rain',
    length: 40
  },
  lengths, pause = true, imageIndex = 0, oldMapLayer, newMapLayer, preImageUrl, interval = 0, changeHandler,
  toolbar = null, menuSwitch = false, markSwitch = true, toolSwitch = true, viewSwitch = false, colorBoardSwitch = false, images = [], times = [], days, moveLin, timeLine, posChange = 0, opacity = 0, demo = true, groundLayers = [], pointSeries = [],
  cb = $('.colorBoard'),
  resultDom = $('#result1'),
  timeLineDom = $('#timeLine'),
  infoPanel = $('#infoPanel');

var config = {
  combineZoomValue: 7,
  center: [116.4010, 39.9814],
  changeSpeed: 1200,
  updateDuring: 800,
  restartDuring: 1e3,
  imagesOpacity: .4,
  positionShiftFix: [0, 0],
  pointDataDays: 7,
  displayPicsNo: 10,
  imageListUrl: apiHost + 'metadata',
  hackUrl: apiHost + 'tentative',
  pointDataUrl: apiHost + 'pdata',
  realtimeUrl: apiHost + 'meteimg/realtime',
  singleRadar: apiHost + 'meteimg/singleradar',
  realRadarLength: 8,
  realAqiLength: 1,
  preLength: 40
};
var map = new AMap.Map('mapContainer', {
  resizeEnable: true,
  level: 7
});
var marker = new AMap.Marker({
  map: map,
  icon: new AMap.Icon({
    size: new AMap.Size(65, 82),
    image: './images/pin.png'
  }),
  offset: new AMap.Pixel(-30, -62),
  zIndex: 150,
  draggable: false
});
var tools = {
  zeroPad: function (n, width) {
    return new Array(Math.max(width - n.toString().length, 0) + 1).join('0') + n.toString();
  },
  resetVeriables: function () {
    images = [];
    timeLine = '';
    timeLineDom = '';
    times = [];
    for (var i = 0; i < groundLayers.length; i++) {
      groundLayers[i].setMap(null);
    }
    groundLayers.length = 0;
  },
  toUTCTimeString: function (date) {
    return demo ? '2015090102' : (date.getUTCFullYear() +
    tools.zeroPad(date.getUTCMonth() + 1, 2) +
    tools.zeroPad(date.getUTCDate(), 2) +
    tools.zeroPad(date.getUTCHours(), 2));
  },
  toLocaltimeString: function (date) {
    return date.getFullYear() +
      tools.zeroPad(date.getMonth() + 1, 2) +
      tools.zeroPad(date.getDate(), 2) +
      tools.zeroPad(date.getHours(), 2);
  },
  timeLineString: function (date) {
    return tools.zeroPad(date.getHours(), 2) + ':' +
      tools.zeroPad(date.getMinutes(), 2);
  },
  mapRecenter: function (e, a) {
    map.panTo(e);
    var offsetX = a[0],
      offsetY = a[1];
    setTimeout(map.panBy(offsetX, offsetY), 500);
  },
  addDate: function (start, d) {
    return demo ? '2015090402' : (tools.toUTCTimeString(new Date(start.getTime() + d * 1000 * 3600 * 24)));
  },
  minuseDate: function (start, d) {
    return (start.getTime() - d * 1000 * 3600 * 24);
  },
  sprintf: function () {
    var args = arguments, e = args[0] || '', a = 1;
    for (var i = args.length; i > a; a++) {
      e = e.replace(/%s/, args[a]);
    }
    return e;
  },
  fixRain: function (value) {
    return value === 0 ? 0 : (value + '<br>mm');
  },
  fixWind: function (value) {
    return value === 0 ? 0 : (value + '<br>km/h');
  },
  fixWeat: function (value) {
    return value === 0 ? 0 : (value + '%');
  },
  getPointData: function (d) {
    var weatherData = '';
    if (typeof d[type.weather] !== 'undefined' && d[type.weather].length > 0) {
      switch (type.weather) {
        case 'rain':
          weatherData = tools.fixRain((d.rain[0].split(':')[1] * 1000).toFixed(1));
          break;
        case 'temp':
          weatherData = Math.floor(d.temp[0].split(':')[1]) + '℃';
          break;
        case 'wind_100':
          weatherData = tools.fixWind((d.wind_100[0].split(':')[1] * 1.0).toFixed(1));
          break;
        case 'wind_10':
          weatherData = tools.fixWind((d.wind_10[0].split(':')[1] * 1.0).toFixed(1));
          break;
        case 'weat':
          weatherData = tools.fixWeat(Math.floor(d.weat[0].split(':')[1] * 100));
          break;
        default:
          weatherData = '';
          break;
      }
    }
    return weatherData;
  },
  getDatas: function (d) {
    var weatherData = [];
    if (typeof d[type.weather] !== 'undefined' && d[type.weather].length > 0) {
      for (var i = 0; i < 13; i++) {
        switch (type.weather) {
          case 'rain':
            weatherData.push((d.rain[i].split(':')[1] * 1000).toFixed(1));
            break;
          case 'temp':
            weatherData.push(Math.floor(d.temp[i].split(':')[1]));
            break;
          case 'wind_100':
            weatherData.push((d.wind_100[i].split(':')[1] * 1.0).toFixed(1));
            break;
          case 'wind_10':
            weatherData.push((d.wind_10[i].split(':')[1] * 1.0).toFixed(1));
            break;
          case 'weat':
            weatherData.push(Math.floor(d.weat[i].split(':')[1] * 100));
            break;
          default:
            weatherData.push(0);
            break;
        }
      }
    }
    return weatherData;
  },
  weatherAjax: function (url, callback) {
    $.ajax({
      url: url,
      type: 'get',
      dataType: 'json',
      ifModified: true,
      contentType: 'application/x-www-form-urlencoded;charset=utf-8',
      success: callback
    });
  },
  fixColorBoard: function () {
    $('#color_' + type.weather).css({
      '-webkit-transform': 'scale(0.5)',
      '-moz-transform': 'scale(0.5)',
      '-ms-transform': 'scale(0.5)',
      '-o-transform': 'scale(0.5)',
      'transform': 'scale(0.5)',
      '-webkit-transform-origin': 'bottom right',
      '-moz-transform-origin': 'bottom right',
      '-ms-transform-origin': 'bottom right',
      '-o-transform-origin': 'bottom right',
      'transform-origin': 'bottom right'
    });
  }
};
var mlogMap = {
  //todo 重写时间轴，修改项目为时间轴驱动的图层变化
  renderTimeLine: function () {
    if (times.length === 0) {
      $(timeLineDom).hide();
    } else {
      timeLine = '';
      $('.line').css({'width': '80%'});
      switch (type.weather) {
        case 'rdrain':
          mlogMap.stop();
          var lengthss = Math.min(config.realRadarLength, times.length);
          if (map.getZoom() >= 7) {
            $('.line').css({'width': lengthss * 10 + '%'});
            for (var i = 0; i < lengthss; i++) {
              timeLine += '<span class="timeline_day" style="width:10%">' + tools.timeLineString(new Date(parseInt(times[i]))) + '</span>';
            }
          } else {
            for (i = 0; i < lengthss; i++) {
              timeLine += '<span class="timeline_day" style="width:10%">' + tools.timeLineString(new Date(parseInt(times[i]))) + '</span>';
            }
          }

          $('.day_list').html(timeLine);
          $(timeLineDom).show();

          break;
        case 'rain':
        case 'temp':
        case 'wind_10':
        case 'wind_100':
        case 'cloud':
        case 'cloud_low':
          var thisTime, temp = times[0].substr(6, 2);
          timeLine = '<span class="timeline_day">' + times[0].substr(4, 2) + '/' + times[0].substr(6, 2) + '</span>';
          for (i = 0; i < images.length; i++) {
            thisTime = times[i].substr(6, 2);
            if (temp !== thisTime) {
              timeLine += '<span class="timeline_day">' + times[i].substr(4, 2) + '/' + times[i].substr(6, 2) + '</span>';
              temp = thisTime;
              days++;
            }
          }
          $('.day_list').html(timeLine);
          $(timeLineDom).show();
          break;
        case 'aqi':
          temp = times[0].substr(6, 2);
          console.log(times);
          timeLine = '<span class="timeline_day" style="width:30%">今明两天</span>';
          for (i = 0; i < images.length; i++) {
            thisTime = times[i].substr(6, 2);
            if (temp !== thisTime) {
              timeLine += '<span class="timeline_day">' + times[i].substr(4, 2) + '/' + times[i].substr(6, 2) + '</span>';
              temp = thisTime;
              days++;
            }
          }
          $('.day_list').html(timeLine);
          break;
        case 'aqi_now':
          $(timeLineDom).hide();
          break;
      }
    }
  },
  renderTimeBar: function (i) {
    var leftLength = 0;
    var lengthAll = $('.line').width();
    var eachDay = lengthAll / 8;
    var threePre = eachDay / 7;
    var sixPre = eachDay / 4;
    if (times[i]) {
      switch (type.weather) {
        case 'rdrain':
          if (i === 0) {
            $('.time').css({'left': '24px'});
          } else {
            leftLength = threePre;
            $('.time').addClass('radar-bar');
            if (map.getZoom() >= 7) {
              $('.time').css({
                'display': 'block',
                'left': i * (100 / times.length - 1) + '%'
              });
            } else {
              $('.time').css({
                'display': 'block',
                'left': i * 13.5 + '%'
              });
            }
          }
          $('.time')[0].innerHTML = '';
          break;
        case 'aqi':
          $('.time').removeClass('radar-bar');
          if (i === 0) {
            $('.time').css({'display': 'block', 'left': '24px'});
            $('.time')[0].innerHTML = tools.zeroPad(times[i].substr(8, 2), 2) + ':00';
          } else if (i <= 21) {
            leftLength = threePre;
            $('.time').css({'display': 'block', 'left': i * leftLength + 'px'});
            $('.time')[0].innerHTML = tools.zeroPad(times[i].substr(8, 2), 2) + ':00';
          } else {
            $('.time').css({'display': 'block', 'left': 21 * threePre + (i - 21) * sixPre * 3.1 + 'px'});
            $('.time')[0].innerHTML = '日均';
          }
          break;
        default:
          $('.time').removeClass('radar-bar');
          if (i <= 24) {
            leftLength = threePre;
            $('.time').css({'display': 'block', 'left': i * leftLength + 'px'});
            $('.time')[0].innerHTML = tools.zeroPad(times[i].substr(8, 2), 2) + ':00';
          } else {
            $('.time').css({'display': 'block', 'left': 24 * threePre + (i - 24) * sixPre + 'px'});
            $('.time')[0].innerHTML = tools.zeroPad(times[i].substr(8, 2), 2) + ':00';
          }
          break;
      }
    } else {
      $('.time').css({'display': 'none'});
    }

  },
  shownImage: function () {
    mlogMap.renderTimeBar(imageIndex);
    newMapLayer = groundLayers[imageIndex];
    if (typeof newMapLayer !== 'undefined') {
      newMapLayer.setOpacity(type.weather === 'rain' ? opacity : config.imagesOpacity);
      if (typeof oldMapLayer !== 'undefined') {
        oldMapLayer.setOpacity(0);
      }
      oldMapLayer = newMapLayer;
    }
  },
  changeImages: function () {
    imageIndex++;
    interval = config.changeSpeed;
    var timeLength = parseInt($('.time').css('left').split('.')) + 30, lineLength = parseInt($('.line').width());
    //是否已经运行到最后,回到开始
    if (timeLength > lineLength || imageIndex >= images.length) {
      imageIndex = 0;
      $('.time').css({'left': '0%'});
    }
    //gray = 1 - imageIndex / images.length;
    opacity = (type.weather === 'rdrain') ? 0.8 : 0.5;
    mlogMap.shownImage();
    changeHandler = setTimeout(function () {
      mlogMap.changeImages();
    }, interval);
  },
  start: function () {
    $.when(mlogMap.changeImages()).then(function () {
      $('#play').removeClass('icon-mlogfont-play').addClass('icon-mlogfont-pause');
      pause = false;
    });
  },
  stop: function () {
    if (typeof changeHandler !== 'undefined') {
      clearTimeout(changeHandler);
    }
    $('#play').removeClass('icon-mlogfont-pause').addClass('icon-mlogfont-play');
    pause = true;
  },
  updateImages: function () {
    var imageUrl = images[images.length - 1][0];
    times = [];
    if (images.length > 0 && imageUrl !== '' && preImageUrl !== imageUrl) {
      for (var image, bound, newLayer, j = 0; j < images.length; j++) {
        image = images[j][0];
        if (type.weather === 'rdrain') {
          bound = new AMap.Bounds(new AMap.LngLat(images[j][2].minlon, images[j][2].minlat), new AMap.LngLat(images[j][2].maxlon, images[j][2].maxlat));
        } else {
          bound = new AMap.Bounds(new AMap.LngLat(images[j][2][0].emin, images[j][2][0].nmin), new AMap.LngLat(images[j][2][0].emax, images[j][2][0].nmax));
        }
        newLayer = new AMap.GroundImage(image, bound, {map: map, clickable: true});
        newLayer.setOpacity(0);
        newLayer.setMap(map);
        groundLayers.push(newLayer);
        times.push(images[j][1]);
      }
    }
    mlogMap.renderTimeLine();
    preImageUrl = imageUrl;
    mlogMap.start();
  },
  requestImages: function () {
    var requestUrl;
    for (var i = 0; i < groundLayers.length; i++) {
      groundLayers[i].setMap(null);
    }
    groundLayers.length = 0;
    images = [];
    if (type.weather === 'rdrain') {
      //single or hole country
      if (map.getZoom() < config.combineZoomValue) {
        requestUrl = config.realtimeUrl + '?starttime=' + (tools.minuseDate(new Date(), 2) - 2 * 3600 * 1000) + '&endtime=' + tools.minuseDate(new Date(), 2) + '&timetype=1&type=rdrain';
        $.ajax({
          url: requestUrl,
          ifModified: true,
          success: function (res) {
            var ret = $.parseJSON(res);
            console.log('get country data\n', ret);
            var imageList = ret.series;
            if (imageList.length > 0) {
              lengths = Math.min(imageList.length, type.length);
              for (i = 0; i < lengths; i++) {
                images.push([apiHost + imageList[i].split(':')[1], imageList[i].split(':')[0], ret.bbox[0]]);
              }
              mlogMap.updateImages();
            }
          }
        });
      } else { // single
        var e = map.getCenter().getLng(), a = map.getCenter().getLat();
        requestUrl = config.singleRadar + '?lat=' + a + '&lon=' + e + '&starttime=' + (tools.minuseDate(new Date(), 2) - 2 * 3600 * 1000) + '&endtime=' + tools.minuseDate(new Date(), 2) + '&timetype=1&type=rdrain';
        console.log('request URL', requestUrl);
        $.ajax({
          url: requestUrl,
          ifModified: true,
          success: function (res) {
            var ret = $.parseJSON(res);
            console.log('get single data\n', ret);
            var imageList = ret.series;
            if (imageList.length > 0) {
              var length = Math.min(imageList.length, config.realRadarLength);
              for (i = 0; i < length; i++) {
                images.push([apiHost + imageList[i].split(':')[1], imageList[i].split(':')[0], ret.bbox[0]]);
              }
              console.log('single \n', images);
              mlogMap.updateImages();
            } else {
              $(timeLineDom).hide();
            }
          }
        });
      }
    } else if (type.weather === 'aqi') {
      requestUrl = config.imageListUrl + '?timestamp=' + tools.toLocaltimeString(new Date()) + '&type=' + type.weather;
      $.ajax({
        url: requestUrl,
        ifModified: true,
        success: function (res) {
          var ret = $.parseJSON(res);
          var imageList = ret.series;
          if (imageList.length > 0) {
            console.log(imageList[0].timestamp.substr(-2));
            for (i = 0; i < imageList.length; i++) {
              if (imageList[i].timestamp.substr(-2) !== '24' && i < 24) {
                images.push([apiHost + imageList[i].img, imageList[i].timestamp, ret.bbox]);
              } else if (imageList[i].timestamp.substr(-2) === '24' && i > 24) {
                images.push([apiHost + imageList[i].img, imageList[i].timestamp, ret.bbox]);
              }
            }
            mlogMap.updateImages();
          }
        }
      });
    } else {
      requestUrl = config.imageListUrl + '?timestamp=' + tools.toUTCTimeString(new Date()) + '&type=' + type.weather;
      $.ajax({
        url: requestUrl,
        ifModified: true,
        success: function (res) {
          var ret = $.parseJSON(res);
          var imageList = ret.series;
          console.log('return data\n', ret);
          if (imageList.length > 0) {
            lengths = Math.min(imageList.length, type.length);
            for (i = 0; i < lengths; i++) {
              images.push([apiHost + imageList[i].img, imageList[i].timestamp, ret.bbox]);
            }
            mlogMap.updateImages();
          }
        }
      });
    }

  }
  ,
  placeMarker: function (e) {
    mlogMap.getNewAddress();
    moveLin = $.now();
    if (moveLin - posChange >= 1e3) {
      marker.setMap(null);
      marker.setPosition(position);
      marker.setMap(e);
      posChange = $.now();
      var pUrl = tools.sprintf('%s?timestart=%s&timeend=%s&lat=%s&lon=%s', config.pointDataUrl, tools.toUTCTimeString(new Date()), tools.addDate((new Date()), config.pointDataDays), position.getLat(), position.getLng());
      $.ajax({
        url: pUrl,
        ifModified: true,
        success: function (data) {
          pointSeries = $.parseJSON(data);
          var datas = tools.getPointData($.parseJSON(data));
          if (datas !== 'undefined') {
            marker.setContent('<div class="spin text-center"><span>' + datas + '</span><img src="./images/pin.png"></div>');
            mlogMap.renderInfoPanel();
          }
        }
      });
      var urlBase = document.URL.split('#')[0];
      var formatedUrl = urlBase + '#' + position.lng.toFixed(4) + ',' + position.lat.toFixed(4);
      history.pushState({}, config.urlDescription, formatedUrl);
    }
  }
  ,
  getAddress: function () {
    var lnglatXY = [position.lng, position.lat];
    var MGeocoder;
    AMap.service(['AMap.Geocoder'], function () {
      MGeocoder = new AMap.Geocoder({
        radius: 1000,
        extensions: 'all'
      });
      MGeocoder.getAddress(lnglatXY, function (status, result) {
        if (status === 'complete' && result.info === 'OK') {
          var changeCity = result.regeocode.formattedAddress;
          changeCity = changeCity.length < 9 ? changeCity : changeCity.substring(0, 9) + '...';
          mlogMap.updatePanelData(changeCity);
        }
      });
    });
  }
  ,
  renderInfoPanel: function () {
    if (type.weather === 'rain' || type.weather === 'aqi' || type.weather === 'temp') {
      mlogMap.getAddress();
    } else {
      infoPanel.hide();
    }
  }
  ,
  updatePanelData: function (changeCity) {
    var count = 2,
      hour2 = null,
      aqi = null,
      temp = [],
      cur = null;
    var allDataSuccess = function () {
      count--;
      if (!count) {
        var opt = {
          colors: ['#068894'],
          title: {
            text: changeCity
          },
          legend: {
            enabled: false
          },
          credits: {
            text: null
          },
          exporting: {
            enabled: false
          },
          plotOptions: {
            series: {
              marker: {
                enabled: false
              }
            }
          }
        };
        if (type.weather === 'rain') {
          var mData = hour2.series;
          if (mData.length) {
            var rData = [];
            for (var i = 0; i < 121; i += 10) {
              if (mData[i].rain === 'undefined' || mData[i].rain === 'null') {
                rData.push(null);
              } else {
                rData.push(mData[i].rain);
              }
            }
            var testData = rData;
            mlogMap.handleRainData(rData);
            var rainSettings = {
              series: [{
                name: '降水',
                data: rData
              }, {
                name: '降水',
                data: testData
              }]
            };
          } else {
            rainSettings = {
              series: [{
                name: '降水',
                data: [null, null, null, null, null, null, null, null, null, null, null, null, null]
              }]
            };
          }
          var categories = ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100', '110', '120'];
          var rainPublic = {
            chart: {
              type: 'areaspline',
              backgroundColor: null,
              height: 222,
              width: 300
            },
            subtitle: {
              text: hour2.msg,
              align: 'center',
              style: {
                color: '#068894'
              }
            },
            xAxis: {
              labels: {
                style: {color: '#000000'},
                step: 2,//步长，每隔两个显示一次
                formatter: function () {
                  return categories[this.value];
                }
              },
              tickInterval: 1,
              tickmarkPlacement: 'on',//设置刻度线位于在类别名称的中心
              tickLength: 3,//设置刻度线的长度
              lineColor: '#068894',
              tickColor: '#068894',
              //tickPosition: 'inside',//刻度线在轴的内部
              title: {style: {color: '#000000'}}
            },
            yAxis: {
              gridLineColor: '#DDDDDD',
              gridLineDashStyle: 'ShortDot',
              tickPositions: [0, 2.5, 5, 7.5, 10],
              minPadding: 0,
              startOnTick: false,
              labels: {
                formatter: function () {
                  return null;
                },
                style: {color: '#000000'}
              },
              title: {text: null},
              plotBands: [{
                from: 0,
                to: 2.5,
                label: {text: '小雨', style: {color: '#777777'}},
                zIndex: 999
              }, {
                from: 2.5,
                to: 5,
                label: {text: '中雨', style: {color: '#777777'}},
                zIndex: 999
              }, {
                from: 5,
                to: 7.5,
                label: {text: '大雨', style: {color: '#777777'}},
                zIndex: 999
              }, {
                from: 7.5,
                to: 10,
                label: {text: '暴雨', style: {color: '#777777'}},
                zIndex: 999
              }]
            },
            tooltip: {
              headerFormat: '第{point.key}分钟<br>',
              valueSuffix: 'mm/h',
              pointFormat: '{series.name}：{point.y}',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderWidth: 0,
              shadow: false,
              style: {
                color: 'rgba(0, 0, 0, 0.8)',
                fontSize: '12px',
                fontWeight: 'normal'
              }
            }
          };
          rainSettings = $.extend(rainPublic, rainSettings);
          $('#rainChart').highcharts($.extend({}, opt, rainSettings));
        }
        else if (type.weather === 'aqi') {
          var aqiLen = aqi.length,
            aData = [];
          for (var j = 0; j < aqiLen; j += 2) {
            aData.push(aqi[j].value);
          }
          var aqiSettings = {
            chart: {
              type: 'spline',
              backgroundColor: null,
              height: 222,
              width: 300
            },
            series: [{
              name: '空气质量',
              data: aData
            }],
            subtitle: {
              text: '未来24小时空气质量预报（单位：AQI）',
              align: 'center',
              style: {
                color: '#068894'
              }
            },
            xAxis: {
              categories: ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24'],
              tickmarkPlacement: 'on',
              tickLength: 3,
              lineColor: '#068894',
              tickColor: '#068894',
              labels: {style: {color: '#000000'}, step: 2},
              title: {style: {color: '#000000'}}
            },
            yAxis: {
              gridLineColor: '#DDDDDD',
              gridLineDashStyle: 'ShortDot',
              min: 1,
              labels: {style: {color: '#000000'}},
              minPadding: 0,
              startOnTick: false,
              title: {text: null}
            },
            tooltip: {
              headerFormat: '第{point.key}小时<br>',
              valueSuffix: ' AQI',
              pointFormat: '{series.name}：{point.y}',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderWidth: 0,
              shadow: false,
              crosshairs: [true, true],
              style: {
                color: 'rgba(0, 0, 0, 0.8)',
                fontSize: '12px',
                fontWeight: 'normal'
              }
            }
          };
          marker.setContent('<div class="spin text-center"><span>' + aqi[0].value + '</span><img src="./images/pin.png"></div>');
          $('#rainChart').highcharts($.extend({}, opt, aqiSettings));
        }
        else if (type.weather === 'temp') {
          var tempLen = temp.length, tempData = [];
          for (var k = 0; k < tempLen; k += 2) {
            tempData.push(temp[k]);
          }
          console.log(tempData);
          var tempSettings = {
            chart: {
              type: 'spline',
              backgroundColor: null,
              height: 222,
              width: 300
            },
            series: [{
              name: '气温',
              data: tempData
            }],
            subtitle: {
              text: '未来12小时气温预报（单位：摄氏度）',
              align: 'center',
              style: {
                color: '#068894'
              }
            },
            xAxis: {
              categories: ['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24'],
              tickmarkPlacement: 'on',
              tickLength: 4,
              lineColor: '#068894',
              tickColor: '#068894',
              labels: {style: {color: '#000000'}, step: 2},
              title: {style: {color: '#000000'}}
            },
            yAxis: {
              gridLineColor: '#DDDDDD',
              gridLineDashStyle: 'ShortDot',
              min: 1,
              labels: {style: {color: '#000000'}},
              minPadding: 0,
              startOnTick: false,
              title: {text: null}
            },
            tooltip: {
              headerFormat: '{point.key}小时以后<br>',
              valueSuffix: ' ℃',
              pointFormat: '{series.name}：{point.y}',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderWidth: 0,
              shadow: false,
              crosshairs: [true, true],
              style: {
                color: 'rgba(0, 0, 0, 0.8)',
                fontSize: '12px',
                fontWeight: 'normal'
              }
            }
          };
          $('#rainChart').highcharts($.extend({}, opt, tempSettings));
        }

        $('#temp_num').html(cur.tmp);
        $('#wind_num').html(cur.wind);
        $('#wind_dir').html(cur.wdirDesc);
        $('#hum_num').html(cur.hum);
        $('#aqi_num').html(cur.aqi);
        $('#aqi_desc').html(cur.tip_aqi);
      }
    };
    if (type.weather === 'rain') {
      tools.weatherAjax('http://dev.api.mlogcn.com:8000/api/weather/v2/nc/coor/' + position.lng + '/' + position.lat + '.json', function (data) {
        hour2 = data;
        allDataSuccess();
      });
    }
    else if (type.weather === 'aqi') {
      var startTime = tools.toLocaltimeString(new Date()).substr(0, 10),
        endTime = tools.toLocaltimeString(new Date(new Date().getTime() + 1000 * 3600 * 24)).substr(0, 10);
      tools.weatherAjax('http://dev.api.mlogcn.com:8000/api/weather/v2/aqi/coor/' + position.lng + '/' + position.lat + '/t/' + startTime + '/' + endTime + '.json', function (data) {
        aqi = data;
        allDataSuccess();
      });
    }
    else if (type.weather === 'temp') {
      temp = tools.getDatas(pointSeries);
      allDataSuccess();
    }
    tools.weatherAjax('http://dev.api.mlogcn.com:8000/api/weather/v2/ob/wx/coor/' + position.lng + '/' + position.lat + '.json', function (data) {
      cur = data;
      allDataSuccess();
    });
  }
  ,
  forwordByStep: function () {
    mlogMap.stop();
    imageIndex++;
    mlogMap.shownImage();
  }
  ,
  backwordByStep: function () {
    mlogMap.stop();
    imageIndex--;
    if (imageIndex > 0) {
      mlogMap.shownImage();
    } else {
      imageIndex = images.length - 1;
      mlogMap.shownImage();
    }
  }
  ,
  deleteAddress: function (id) {
    var storage = window.localStorage;
    var key = id.getAttribute('id');
    storage.removeItem(key);
    mlogMap.showAddress();
  }
  ,
  saveAddress: function (index, data) {
    var storage = window.localStorage;
    var newAddress = JSON.stringify(data.tips[index]);
    var timestamp = (new Date()).valueOf();
    storage.setItem('address' + timestamp, newAddress);
    mlogMap.showAddress();
  }
  ,
  showAddress: function () {
    var $addressDropdown = $('.addressDropdown');
    var $parent = $addressDropdown.parent();
    $addressDropdown.click(function () {
      if ($parent.hasClass('closeMenu')) {
        $parent.removeClass('closeMenu');
      } else {
        $parent.addClass('closeMenu');
      }
    });
    var storage = window.localStorage;
    storage.removeItem('_AMap_AMap.Autocomplete');
    storage.removeItem('_AMap_AMap.Geocoder');
    storage.removeItem('_AMap_AMap.ToolBar');
    storage.removeItem('_AMap_imagelayer');
    storage.removeItem('_AMap_mainmcvpvt');
    storage.removeItem('debug');
    var len = storage.length;
    var str = '';
    var keys = null;
    var address = null;
    for (var i = 0; i < len; i++) {
      keys = storage.key(i);
      if (storage.getItem(keys).match(/^{[\w\W]*}$/)) {
        address = JSON.parse(storage.getItem(keys));
        str += '<li id="' + keys + '"><span class="addressName">' + address.name + '</span><span class="mlogicon icon-mlogfont-delete" onclick="mlogMap.deleteAddress(' + keys + ')"></span></li>';
      }
    }
    $('.addressList').html(str);
  }
  ,
  selectResult: function (index, data) {
    if (typeof data === 'undefined') {
      return;
    }
    var newAddress = data.tips[index];

    function focusCallback() {
      if (navigator.userAgent.indexOf('MSIE') > 0) {
        //document.getElementById('keyword').onpropertychange = autoSearch;//todo lm
      }
    }

    if (navigator.userAgent.indexOf('MSIE') > 0) {
      document.getElementById('inputCityName').onpropertychange = null;
      document.getElementById('inputCityName').onfocus = focusCallback;
    }
    var text = document.getElementById('divid' + (index + 1)).innerHTML.replace(/<[^>].*?>.*<\/[^>].*?>/g, '');

    document.getElementById('inputCityName').value = text;
    $(resultDom).hide();
    //position.lng = newAddress.location.lng;
    //position.lat = newAddress.location.lat;
    $('#result1').on('click', 'div', function () {
      position = newAddress.location;
      tools.mapRecenter(position, config.positionShiftFix);
      mlogMap.placeMarker(map);
    });
  }
  ,
  citySearch: function () {
    function autocompleteCallBack(data) {
      var resultStr = '';
      var tipArr = data.tips;
      var test = JSON.stringify(data);
      if (tipArr && tipArr.length > 0) {
        for (var i = 0; i < tipArr.length; i++) {
          resultStr += tools.sprintf('<div id="divid%s"><span class="addressDesc" onclick="mlogMap.selectResult(%s, %s)">%s</span><span class="mlogicon icon-mlogfont-add" onclick="mlogMap.saveAddress(%s, %s)"></span></div>', i + 1, i, test, tipArr[i].name, i, test);
        }
      }
      else {
        resultStr = ' π__π 亲,人家找不到结果!<br />要不试试：<br />1.请确保所有字词拼写正确<br />2.尝试不同的关键字<br />3.尝试更宽泛的关键字';
      }

      resultDom.curSelect = -1;
      resultDom.tipArr = tipArr;
      resultDom.innerHTML = resultStr;
      $(resultDom).show();
    }

    function autoSearch() {
      var keywords = document.getElementById('inputCityName').value;
      var auto;
      map.plugin(['AMap.Autocomplete'], function () {
        var autoOptions = {
          city: ''
        };
        auto = new AMap.Autocomplete(autoOptions);
        if (keywords.length > 0) {
          AMap.event.addListener(auto, 'complete', autocompleteCallBack);
          auto.search(keywords);
        }
        else {
          $(resultDom).hide();
        }
      });
    }

    function keydown(event) {
      var key = (event || window.event).keyCode;
      var result = resultDom;
      var cur = result.curSelect;
      if (key === 40) {//down key
        if (cur + 1 < result.childNodes.length) {
          if (result.childNodes[cur]) {
            result.childNodes[cur].style.background = '';
          }
          result.curSelect = cur + 1;
          result.childNodes[cur + 1].style.background = '#CAE1FF';
          document.getElementById('inputCityName').value = result.tipArr[cur + 1].name;
        }
      } else if (key === 38) {//up key
        if (cur - 1 >= 0) {
          if (result.childNodes[cur]) {
            result.childNodes[cur].style.background = '';
          }
          result.curSelect = cur - 1;
          result.childNodes[cur - 1].style.background = '#CAE1FF';
          document.getElementById('inputCityName').value = result.tipArr[cur - 1].name;
        }
      }
      else if (key === 13) {
        var res = resultDom;
        if (res && res.curSelect !== -1) {
          console.log(resultDom.curSelect);
          mlogMap.selectResult(resultDom.curSelect);
        }
      }
      else {
        autoSearch();
      }
    }

    document.getElementById('inputCityName').onkeyup = keydown;
  }
  ,
  getNewAddress: function () {
    var lnglatXY = [position.lng, position.lat];
    var MGeocoder;
    //加载地理编码插件
    AMap.service(['AMap.Geocoder'], function () {
      MGeocoder = new AMap.Geocoder({
        radius: 1000,
        extensions: 'all'
      });
      //逆地理编码
      MGeocoder.getAddress(lnglatXY, function (status, result) {
        if (status === 'complete' && result.info === 'OK') {
          var changeCity = result.regeocode.formattedAddress;
          changeCity = changeCity.length < 9 ? changeCity : changeCity.substring(0, 9) + '...';
          console.log(changeCity);
          mlogMap.updatePanelData(changeCity);
        }
      });
    });
  }
};

var initialize = function () {
  //初始化的位置在中心点位置
  position = new AMap.LngLat(config.center[0], config.center[1]);
  mlogMap.placeMarker(map);
  mlogMap.citySearch();
  mlogMap.showAddress();
  infoPanel.hide();
  tools.mapRecenter(position, config.positionShiftFix);
  //当地图的瓦片底图加载完毕后,加载所有的底图
  AMap.event.addListener(map, 'complete', function () {
    mlogMap.requestImages();
    if (images.length > 0) {
      for (var i = 0; i < groundLayers.length; i++) {
        groundLayers[i].setMap(map);
      }
      mlogMap.start();
    }
  });
  AMap.event.addListener(map, 'complete', function () {
    map.plugin(['AMap.ToolBar'], function () {
      toolbar = new AMap.ToolBar({autoPosition: false});
      map.addControl(toolbar);
    });
    infoPanel.hide();
  });
  AMap.event.addListener(map, 'click', function (pos) {
    position = pos.lnglat;
    mlogMap.placeMarker(map);
    infoPanel.hide();
  });
  var oldZoom = map.getZoom();
  AMap.event.addListener(map, 'zoomchange', function () {
    if (type.weather === 'rdrain') {
      var newZoom = map.getZoom();
      if (newZoom >= 7 && oldZoom < 7 || newZoom < 7 && oldZoom >= 7) {
        mlogMap.stop();
        mlogMap.requestImages();
      }
      oldZoom = newZoom;
    }
  });
  AMap.event.addListener(marker, 'click', function (pos) {
    var h = window.innerHeight, w = window.innerWidth - 300, panelH = infoPanel.height(), panelW = infoPanel.width(), pointX = parseInt(pos.pixel.x), pointY = parseInt(pos.pixel.y), top, left;
    if (pointX > 0 && pointX < (w - panelW)) {
      left = pointX + 20 + 'px';
    } else {
      left = pointX - (panelW + 20) + 'px';
    }
    if (pointY > 0 && pointY < (h - panelH)) {
      top = pointY + 20 + 'px';
    } else {
      top = pointY - (panelH + 20) + 'px';
    }
    infoPanel.css({
      'top': top,
      'left': left
    });
    mlogMap.renderInfoPanel();
    if (type.weather === 'rain' || type.weather === 'aqi' || type.weather === 'temp') {
      infoPanel.show();
    }
  });
  $('.l_nav_forecast').find('input').bind('focus', function () {
    $('.l_nav_forecast').find('.blue-back').each(function () {
      $(this).removeClass('blue-back');
    });
    $(this).parent().parent().addClass('blue-back');

    if (type.weather === this.id) {
      return;
    }

    type.weather = this.id;
    mlogMap.stop();
    imageIndex = 0;
    map.clearMap();
    for (var i = 0; i < groundLayers.length; i++) {
      groundLayers[i].setMap(null);
    }
    groundLayers.length = 0;
    images = [];
    var mc = $('#mapContainer'), ifr = $('iframe');
    switch (type.weather) {
      case 'wind_10s':
        mc.hide();
        infoPanel.hide();
        cb.empty();
        timeLineDom.hide();
        $('.l_body').append('<iframe scrolling="no" width="100%" height="100%" src="http://wx.mlogcn.com/static/open/wcloud/scripts/wind10s/example/map3d_wave.html"></iframe>');
        break;
      case 'aqi_now':
        type.weather = 'aqi';
        mc.show();
        ifr.remove();
        infoPanel.hide();
        map.setMapStyle('normal');
        marker.show();
        cb.empty();
        cb.append('<div id="color_' + type.weather + '_outer"><div id="color_' + type.weather + '"></div></div>').show();
        tools.fixColorBoard();
        timeLineDom.hide();
        mlogMap.requestImages();
        mlogMap.placeMarker(map);
        break;
      case 'rain':
      case 'temp':
      case 'wind_10':
      case 'wind_100':
      case 'weat':
        mc.show();
        ifr.remove();
        infoPanel.hide();
        map.setMapStyle('normal');
        marker.show();
        timeLineDom.show();
        cb.empty();
        cb.append('<div id="color_' + type.weather + '_outer"><div id="color_' + type.weather + '"></div></div>').show();
        tools.fixColorBoard();
        mlogMap.requestImages();
        mlogMap.placeMarker(map);
        break;
      case 'rdrain':
        mc.show();
        ifr.remove();
        infoPanel.hide();
        map.setMapStyle('normal');
        marker.hide();
        timeLineDom.show();
        cb.empty();
        cb.append('<div id="color_' + type.weather + '_outer"><div id="color_' + type.weather + '"></div></div>').show();
        tools.fixColorBoard();
        //todo 分级请求不同的数据
        mlogMap.requestImages();
        break;
      case 'cloud_low':
      case 'cloud':
        mc.show();
        ifr.remove();
        cb.empty();
        infoPanel.hide();
        map.setMapStyle('dark');
        marker.hide();
        cb.empty();
        timeLineDom.show();
        cb.append('<div id="color_' + type.weather + '_outer"><div id="color_' + type.weather + '"></div></div>').show();
        tools.fixColorBoard();
        mlogMap.requestImages();
        break;
      case 'aqi':
        mc.show();
        ifr.remove();
        infoPanel.hide();
        map.setMapStyle('normal');
        marker.show();
        cb.empty();
        timeLineDom.show();
        cb.append('<div id="color_' + type.weather + '_outer"><div id="color_' + type.weather + '"></div></div>').show();
        tools.fixColorBoard();
        mlogMap.requestImages();
        mlogMap.placeMarker(map);
        break;
      default :
        mc.show();
        ifr.remove();
        marker.hide();
        infoPanel.hide();
        timeLineDom.hide();
        break;
    }
  });

  $('#play').bind('click', function () {
    if (pause === false) {
      mlogMap.stop();
    } else {
      mlogMap.start();
    }
  });
  $('#forward').bind('click', function () {
    mlogMap.forwordByStep();
  });
  $('#backward').bind('click', function () {
    mlogMap.backwordByStep();
  });
  $('#setFitView').bind('click', function () {
    if (!viewSwitch) {
      map.setZoomAndCenter(4, [position.lng, position.lat]);
      $(this).removeClass('btn-default');
    } else {
      $(this).addClass('btn-default');
    }
    viewSwitch = !viewSwitch;
  });
  $('#toolBar').bind('click', function () {
    if (!toolSwitch) {
      toolbar.show();
      $(this).removeClass('btn-default');
    } else {
      toolbar.hide();
      $(this).addClass('btn-default');
    }
    toolSwitch = !toolSwitch;
  });
  $('#tag').bind('click', function () {
    if (!markSwitch) {
      marker.show();
      $(this).removeClass('btn-default');
    } else {
      marker.hide();
      $(this).addClass('btn-default');

    }
    markSwitch = !markSwitch;
  });
  $('#colorBoard').bind('click', function () {
    if (!colorBoardSwitch) {
      cb.empty();
      if (type.weather === 'cloud_low' || type.weather === 'cloud') {
        $(this).tooltip('show');
        $('.tooltip').width(300);
      } else {
        $(this).tooltip('hide');
        cb.append('<div id="color_' + type.weather + '_outer"><div id="color_' + type.weather + '"></div></div>').show();
        $('#color_' + type.weather).css({
          '-webkit-transform': 'scale(0.5)',
          '-moz-transform': 'scale(0.5)',
          '-ms-transform': 'scale(0.5)',
          '-o-transform': 'scale(0.5)',
          'transform': 'scale(0.5)',
          '-webkit-transform-origin': 'bottom right',
          '-moz-transform-origin': 'bottom right',
          '-ms-transform-origin': 'bottom right',
          '-o-transform-origin': 'bottom right',
          'transform-origin': 'bottom right'
        });
        $(this).removeClass('btn-default');
      }
    } else {
      cb.empty().hide();
      $(this).tooltip('hide');
      $(this).addClass('btn-default');
    }
    colorBoardSwitch = !colorBoardSwitch;
  });
  $('#menu').bind('click', function () {
    var menu = $('.l_nav'), body = $('.l_body');
    if (!menuSwitch) {
      menu.show();
      $(this).removeClass('btn-default');
      body.css({'marginLeft': '220px'});
    } else {
      menu.hide();
      $(this).addClass('btn-default');
      body.css({'marginLeft': '0'});
    }
    menuSwitch = !menuSwitch;
  });
};
$(function () {
  initialize();
  $('.amap-copyright').hide();
});
