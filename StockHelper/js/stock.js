var stockGetInfos = undefined;
var stockGetUrl = undefined;

/*判断是否是股票交易时间段*/
function isOperation() {
	var today = new Date();
	
	var day = today.getDay();
	if ( day == 0 || day == 6 )
		return false;
	
	var hour = today.getHours();
	var minute = today.getMinutes();
	var time = hour * 100 + minute;

	if ( ( time > 920 && time < 1135 ) || ( time > 1255 && time < 1505 ) ) {
		return true;
	}

	return false;
}

function isWebkitHTMLNotificationsEnabled() {
	return window.webkitNotifications && window.webkitNotifications.createHTMLNotification;
}

//打开该股票在新浪财经的页面
function openStockPage(stockCode) {
	console.log('ffff');
	chrome.tabs.create({url: "http://finance.sina.com.cn/realstock/company/" + stockCode + "/nc.shtml", selected: false});
}
//打开新浪财经股票首页
function openSinaStock() {
	chrome.tabs.create({url: "http://finance.sina.com.cn/stock/index.shtml"});
}
/*股票的价格走势图 http://image.sinajs.cn/newchar/min/n/sh000001.gif?random()*/
function getImageSrc(stockCode) {
	return "http://image.sinajs.cn/newchart/min/n/" + stockCode + ".gif?" + Math.random();
}
/*股票的日K线图和成交量图 http://image.sinajs.cn/newchart/daily/n/sh000001.gif?random()*/
function getImageSrc2(stockCode) {
	return "http://image.sinajs.cn/newchart/daily/n/" + stockCode + ".gif?" + Math.random();
}
//从Settings中获取添加的股票列表
function loadStocks() {
	var stocks = Settings.getObject("stockListStocks");
	
	stockGetInfos = [];
	
	if ( stocks == undefined ) {
		return;
	}
	
	stockGetUrl = "http://hq.sinajs.cn/list=";
	
	var index = 0;
	for (var i in stocks) {
		var stock = stocks[i];
		stockGetUrl += stock.stockCode + ",";
		
		var stockInfo = {
			stockIndex: index,
			stockName: stock.stockName,
			stockCode: stock.stockCode,
			stockUpPrice: stock.stockUpPrice,
			stockDownPrice: stock.stockDownPrice,
			stockFlag: stock.stockFlag,
			stockOpenPrice: "0.00",
			stockClosePrice: "0.00",
			stockCurrPrice: "0.00",
			stockMaxPrice: "0.00",
			stockMinPrice: "0.00",
			stockLastDate: "0000-00-00",
			stockLastTime: "00:00:00",
			stockVolume: "0",
			stockTurnover: "0",
			stockCurrAlertState: 0,
			stockLastAlertState: 0,
			stockChangeAmt: "0.00",
			stockChangeRate: "0.00"
		};
		
		stockGetInfos[index] = stockInfo;
		index++;
	}
};

function setStocks(strStocks) {
	
	stockGetUrl = "http://hq.sinajs.cn/list=" + strStocks;
	stockGetInfos = [];
	
	var stockCodes = strStocks[i].split(",");
	
	for (var i=0; i< stockCodes.length -1; i++) {
		var stockInfo = {
			stockIndex: i,
			stockName: "",
			stockCode: stockCodes[i],
			stockUpPrice: "0.00",
			stockDownPrice: "0.00",
			stockOpenPrice: "0.00",
			stockClosePrice: "0.00",
			stockCurrPrice: "0.00",
			stockMaxPrice: "0.00",
			stockMinPrice: "0.00",
			stockLastDate: "0000-00-00",
			stockLastTime: "00:00:00",
			stockVolume: "0",
			stockTurnover: "0",
			stockCurrAlertState: 0,
			stockLastAlertState: 0,
			stockChangeAmt: "0.00",
			stockChangeRate: "0.00"
		};
		
		stockGetInfos[i] = stockInfo;
	}	
};

var bfirstload = true;

function updateStocks() {
	if ( stockGetUrl == undefined ) {
		return;
	}
	try {
		
		var xhr = new window.XMLHttpRequest();
		
		xhr.open("GET", stockGetUrl, false);
		xhr.onreadystatechange = function() {
			var stockInfo = undefined;
			
			if (xhr.readyState == 4) {
				var stockListArray = xhr.responseText.split(";");
				
				for (var i = 0; i < stockListArray.length; i++) {
					var stockInfo = stockGetInfos[i];
					var elements = stockListArray[i].split(/_|="|,|"/);
			
					if(elements.length > 4) {
						try {
							if ( bfirstload ) stockInfo.stockName = elements[3];
							stockInfo.stockOpenPrice = parseFloat(elements[4]).toFixed(2);
							stockInfo.stockClosePrice = parseFloat(elements[5]).toFixed(2);
							stockInfo.stockCurrPrice = parseFloat(elements[6]).toFixed(2);
							stockInfo.stockMaxPrice = parseFloat(elements[7]).toFixed(2);
							stockInfo.stockMinPrice = parseFloat(elements[8]).toFixed(2);
							stockInfo.stockVolume = (parseInt(elements[11]) / 100).toFixed();
							stockInfo.stockTurnover = (parseInt(elements[12]) / 10000).toFixed();
							stockInfo.stockLastDate = elements[33];
							stockInfo.stockLastTime = elements[34];
							
							if (stockInfo.stockOpenPrice != 0) {
								stockInfo.stockChangeAmt = parseFloat(stockInfo.stockCurrPrice - stockInfo.stockClosePrice).toFixed(2);
								stockInfo.stockChangeRate = (parseFloat(stockInfo.stockChangeAmt / stockInfo.stockClosePrice)*100).toFixed(2);
							}
						} catch(e) { 
							console.error(e); 
							console.log(elements);
						}
						
						delete stockInfo;
					}
					delete elements;
				}
				delete stockListArray;
				bfirstload = false;
			}
			
			delete xhr;
		}
		xhr.send();
	} catch(e) { console.error(e); }
};

function getStockInfo(stockCode, f){
	try {
		var xhr = new window.XMLHttpRequest();
		//股票返回格式var hq_str_sh000001=
		// 股票名称,今开,    昨收,    今收,    最高,    最低    , , ,成交量,   成交额,         ,                                       ,更新时间
		//"上证指数,5016.088,4947.102,5023.096,5051.626,4898.068,0,0,772240812,1232300667129.60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2015-06-05,15:05:05,00";
		//  3      , 4      ,      5 ，   6   ,    7   ,    8   , , , 11，    ,    12          ,   
		//基金返回格式var hq_str_of110028=
		// 基金名称           ,最新,累计 ,上次 ,涨幅, 时间
		//"易方达安心回报债券B,1.86,2.365,1.858,0.11,2015-06-05";
		//   3                , 4  ,  5  , 6   ,  7 ,    8
		xhr.open("GET", "http://hq.sinajs.cn/list=" + stockCode, true);
		xhr.onreadystatechange = function() {
			var stockInfo = undefined;
			var stockName = undefined;
		
			if (xhr.readyState == 4) {
				var elements = xhr.responseText.split(/_|="|,|"/);
				alert(elements);
				if(elements.length > 5) {
					try {
						stockInfo = {
							stockOpenPrice: parseFloat(elements[4]).toFixed(2),
							stockClosePrice: parseFloat(elements[5]).toFixed(2),
							stockCurrPrice: parseFloat(elements[6]).toFixed(2),
							stockMaxPrice: parseFloat(elements[7]).toFixed(2),
							stockMinPrice: parseFloat(elements[8]).toFixed(2),
							stockVolume: (parseInt(elements[11]) / 100).toFixed(),
							stockTurnover: (parseInt(elements[12]) / 10000).toFixed(),
							stockLastDate: elements[33],
							stockLastTime: elements[34],
							stockChangeAmt: "0.00",
							stockChangeRate: "0.00"
						}
						
						if (stockInfo.stockOpenPrice != 0) {
							stockInfo.stockChangeAmt = parseFloat(stockInfo.stockCurrPrice - stockInfo.stockClosePrice).toFixed(2);
							stockInfo.stockChangeRate = (parseFloat(stockInfo.stockChangeAmt / stockInfo.stockClosePrice)*100).toFixed(2);
						}
						
						stockName = elements[3];
					} catch(e) { 
						console.error(e); 
						console.log(elements);
					}
				}
				delete elements;
				
				if (typeof f == "function") {
					f(stockInfo, stockName);
				}
				if ( stockInfo == undefined ) delete stockInfo;
			}
			
			delete xhr;
		}
		xhr.send();
	} catch(e) { console.error(e); }
};