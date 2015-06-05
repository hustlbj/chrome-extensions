$(document).ready(function() {
	$("#btnOpenOptionsPage").click(function() {
		chrome.tabs.create({url: "options.html?#custom-stock-infos"});
	});

	$("#btnOpenStockNotifyPage").click(function() {
		chrome.tabs.create({url: "https://chrome.google.com/webstore/detail/%E8%82%A1%E7%A5%A8%E6%8F%90%E9%86%92%E5%8A%A9%E6%89%8B/goiffchdhlcehhgdpdbocefkohlhmlom/reviews"});
	});
	
	$("#btnPriceDisplay").click(function() {
		setPriceDisplay();
	});
	
	$("#btnOpenSinaStock").click(function() {
		openSinaStock();
	});
	
	createStockDisplayDOM();
});

var pageWidth = 380;
var currentPosition = 0;

var stockNotifyPopup = true;
var stockGetInfos = undefined;
var backgroundPage = chrome.extension.getBackgroundPage();

function customStock() {
	$('#stockList').animate({
		opacity: 0.25,
		left: '+=50',
		height: 'toggle'
	}, 5000, function() {
		// Animation complete.
	});
}

function setPriceDisplay() {
	if (backgroundPage.Settings.getValue("showPrice", true)) {
		backgroundPage.Settings.setValue("showPrice", false);
		$("#btnPriceDisplay").text("显示价格");
	}
	else {
		backgroundPage.Settings.setValue("showPrice", true);
		$("#btnPriceDisplay").text("隐藏价格");
	}
	
	backgroundPage.displayStocks();
}

function createStockDisplayDOM() {
	var pictureContainerTitle = "";
	if (backgroundPage.Settings.getValue("showSinaLink", true))
		pictureContainerTitle = "点击打开股票网页";
	else
		$("#btnOpenSinaStock").hide();
	
	if (backgroundPage.Settings.getValue("showPrice", true))
		$("#btnPriceDisplay").text("隐藏价格");
	else
		$("#btnPriceDisplay").text("显示价格");
	
	stockGetInfos = backgroundPage.stockGetInfos;
	currentPosition = backgroundPage.Settings.getValue("popupStockPosition", 0);
	
	if (!stockGetInfos || stockGetInfos.length == 0)
	{
		chrome.tabs.create({url: "options.html"});
		close();
	}
	else
	{
		var html = "";
		for (var i in stockGetInfos) {
			var stock = stockGetInfos[i];
			
			html += "	<div id=\"stockContainer\" class=\"stockContainer\">\r\n";
			html += "		<div class=\"stockInfoContainer\">\r\n";
			html += "			<div class=\"stockPriceContainer\">\r\n";
			html += "				<div id=\"" + stock.stockCode + "stockPrice\" class=\"stockPrice\">0.00</div>\r\n";
			html += "				<div id=\"" + stock.stockCode + "stockChange\" class=\"stockChange\">0.00(0.00%)</div>\r\n";
			html += "				<div id=\"" + stock.stockCode + "stockTime\" class=\"stockTime\"><br/></div>\r\n";
			html += "			</div>\r\n";
			html += "			<div id=\"" + stock.stockCode + "stockName\" class=\"stockName\">" + stock.stockName + "(" + stock.stockCode + ")</div>\r\n";
			html += "			<div id=\"" + stock.stockCode + "openPrice\" class=\"openPrice\"><br/></div>\r\n";
			html += "			<div id=\"" + stock.stockCode + "closePrice\" class=\"closePrice\"><br/></div>\r\n";
			html += "			<div id=\"" + stock.stockCode + "maxPrice\" class=\"maxPrice\"><br/></div>\r\n";
			html += "			<div id=\"" + stock.stockCode + "minPrice\" class=\"minPrice\"><br/></div>\r\n";
			html += "			<div id=\"" + stock.stockCode + "volume\" class=\"volume\"><br/></div>\r\n";
			html += "			<div id=\"" + stock.stockCode + "turnover\" class=\"turnover\"><br/></div>\r\n";
			html += "		</div>\r\n";
			if (backgroundPage.Settings.getValue("showSinaLink", false))
				html += "	<a href=\"#\" class=\"openStockPage\" tag=\"" + stock.stockCode + "\">\r\n";
			if(Settings.getValue("showPicture", true))
				html += "           <div id=\"" + stock.stockCode + "pictureContainer\" class=\"pictureContainer\" title=\"" + pictureContainerTitle + "\">加载中...</div>\r\n";
			else
				html += "           <div id=\"" + stock.stockCode + "pictureContainer\" class=\"pictureContainer\" title=\"" + pictureContainerTitle + "\">已取消股票图片加载、显示。</div>\r\n";
			if (backgroundPage.Settings.getValue("showSinaLink", false))
				html += "	</a>\r\n";
			html += "	</div>\r\n";

			$(document.createElement("li"))
				.attr("id","control" + (stock.stockIndex+1))
				.html("<a rel=\""+ stock.stockIndex +"\" id=\"" + stock.stockCode +"_page\" href=\"javascript:void(0);\"><div class=\"stockPageName\">"+ stock.stockName +"</div><div class=\"stockPageInfo\">0.00 (0.00)</div></a>")
				.appendTo($("#controls"))
				.click(function(){
					setCurrent($("a",$(this)).attr("rel"));
				}); 
		}
		
		$("#stockPage").html(html);
		$("#stockPage").css("width", pageWidth * stockGetInfos.length);
		
		$(".openStockPage").click(function() {
			openStockPage($(this).attr('tag'));
		});
		
		$("#stockDisplay").css("height", 320 + Math.ceil(stockGetInfos.length/6) * 32);
		
		backgroundPage.displayStocks();
		backgroundPage.stopAnimateLoop();
		
		if(Settings.getValue("showPicture", true))
			stockPopupTimer = window.setTimeout(loadStockImage, 300);
		
		$(".pictureContainer").hover(
			function () {
				var oImage = $(this).find('img');
				if (oImage) oImage.attr("src", getImageSrc2(oImage.attr("name")));
			}, 
			function () {
				var oImage = $(this).find('img');
				if (oImage) oImage.attr("src", getImageSrc(oImage.attr("name")));
			}
		);
		
		setCurrent(currentPosition);
	}
}
function setCurrent(i){
	currentPosition = parseInt(i);
	
	$("#stockPage").animate({
		"marginLeft" : -pageWidth*currentPosition
	});
	
	backgroundPage.Settings.setValue("popupStockPosition", currentPosition);
	backgroundPage.popupStockPosition = currentPosition;
	backgroundPage.displayStocks();
};

function loadStockImage(){
	if (stockGetInfos == undefined)
		return;
	
	for (var i in stockGetInfos) {
		var stock = stockGetInfos[i];
		
		var stockImgUrl = getImageSrc(stock.stockCode);
		
		var img = new Image();
		img.name = stock.stockCode;
		
		img.onload = function(){
			$("#" + this.name + "pictureContainer").html(this);
		};
		
		img.onerror=function(){
			$("#" + this.name + "pictureContainer").html("股价图片下载失败！");
		};
		
		img.src = stockImgUrl;
		
		delete img;
		delete stockImgUrl;
	}
	
	stockPopupTimer = window.setTimeout(loadStockImage, 500000);
}

function displayStock(stockInfo) {
	try {
		var color = "#333";
		
		if (stockInfo.stockOpenPrice != 0)
		{
			if (parseFloat(stockInfo.stockCurrPrice) < parseFloat(stockInfo.stockClosePrice))
				color = "#287900";
			else if (parseFloat(stockInfo.stockCurrPrice) >= parseFloat(stockInfo.stockClosePrice)) 
				color = "#DD0000";
		}
		
		$("#" + stockInfo.stockCode + "_page .stockPageInfo").css({ "color" : color });
		$("#" + stockInfo.stockCode + "_page .stockPageInfo").css({ "border" : "1px solid" + color });
		$("#" + stockInfo.stockCode + "_page .stockPageName").css({ "background-color" : color });

		$("#" + stockInfo.stockCode + "_page .stockPageInfo").html( "<div>" + stockInfo.stockCurrPrice + " | " + stockInfo.stockChangeRate.replace("-","") + "</div>");

		if (stockInfo.stockCurrAlertState == 1 || stockInfo.stockCurrAlertState == 2)
		{
			$("#" + stockInfo.stockCode + "_page").addClass("StockAlert");
			$("#" + stockInfo.stockCode + "stockPrice").addClass("StockAlert");
		}
		else
		{
			$("#" + stockInfo.stockCode + "_page").removeClass("StockAlert");
			$("#" + stockInfo.stockCode + "stockPrice").removeClass("StockAlert");
		}
		
		if (stockInfo.stockCurrPrice.length > 7) {
			$("#" + stockInfo.stockCode + "stockPrice").css({ color : color })
		    	                                       .html(stockInfo.stockCurrPrice)
		    	                                       .addClass("overMaxPrice");
		}
		else {
			$("#" + stockInfo.stockCode + "stockPrice").css({ color : color })
		    	                                       .html(stockInfo.stockCurrPrice)
		    	                                       .removeClass("overMaxPrice");
		}
		$("#" + stockInfo.stockCode + "stockChange").css({ color : color })
		                                            .html(stockInfo.stockChangeAmt + " (" + stockInfo.stockChangeRate + "%)");
		$("#" + stockInfo.stockCode + "stockName").html(stockInfo.stockName + "(" + stockInfo.stockCode +")");
		$("#" + stockInfo.stockCode + "minPrice").html("最　低：" + stockInfo.stockMinPrice);
		$("#" + stockInfo.stockCode + "maxPrice").html("最　高：" + stockInfo.stockMaxPrice);
		$("#" + stockInfo.stockCode + "openPrice").html("今　开：" + stockInfo.stockOpenPrice);
		$("#" + stockInfo.stockCode + "closePrice").html("昨　收：" + stockInfo.stockClosePrice);
		$("#" + stockInfo.stockCode + "volume").html("成交量：" + stockInfo.stockVolume);
		$("#" + stockInfo.stockCode + "turnover").html("成交额：" + stockInfo.stockTurnover);
		$("#" + stockInfo.stockCode + "stockTime").html(stockInfo.stockLastDate + " " + stockInfo.stockLastTime);

		delete priceContainer;
		
		window.refresh();
	}
	catch(err) {
	}
}