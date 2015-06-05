$(document).ready(function() {
   init(); 
});

var backgroundPage = null; 
var stopUpdateInfo = false;

function saveOptions()
{	
	var stocks = {};
	var rows = $("#stocksTable .tableRow");
	var stockId = 0;
	
	for (var i = 0; i < rows.length; i++)
	{
		var row = rows[i];

		var flag = $(".flag", row).hasClass("remove") ? 1 : 0;
		
		var stock = {
			stockName: $(".stockName", row).text(),
			stockCode: $(".stockCode", row).text(),
			stockUpPrice: parseFloat($(".stockUpPrice", row).text()).toFixed(2),
			stockDownPrice: parseFloat($(".stockDownPrice", row).text()).toFixed(2),
			stockFlag: flag,
		};
		
		if (stock.stockCode != "")
		{
			stocks[stockId] = stock;
			stockId++;
		}
    }
	
	Settings.setObject("stockListStocks", stocks);
	
	if (rows.length < Settings.getValue("popupStockPosition"))
		Settings.setValue("popupStockPosition", 0);
	
	backgroundPage.reloadSock = true;
	backgroundPage.refreshStocks();
	
	initializeStockRow();
	
	showMessage("保存成功");
}

function saveStockNote() {
	var stockCode = $("textarea#txtStockNote").attr("tag");
	
	Settings.setValue("note_" + stockCode, $("textarea#txtStockNote").val());
	
	showMessage("保存备注成功");
}

var hideMessageTime = -1;

function showMessage(msg) {
	
	$("#message").html(msg).css({ 'top': '-34' }).animate({ 'top': '0' }, 100);
	
	if (hideMessageTime > 0)
		hideMessageTime = 20;
	else
	{
		hideMessageTime = 20;
		window.setTimeout(eraseMessage, 100);
	}
}

function eraseMessage() {
	if (hideMessageTime > 0)
	{
		hideMessageTime--;
		window.setTimeout(eraseMessage, 100);
	}
	else
	{
		$("#message").animate({ 'top': '-34' }, 200);
	}
}

function init() {
	initializeTabs();
	
	$("#div-stock-note").hide();
	$("#stock-note-control").hide();
	
	backgroundPage = chrome.extension.getBackgroundPage();
	
	if ( backgroundPage.Settings.getValue("displayAlert", true) ) {
		if ( isWebkitHTMLNotificationsEnabled() ) {
			 if ( webkitNotifications.checkPermission() == 0 ) 	$("#displayAlertInput").attr("checked", "checked");
		}
		else {
			$("#displayAlertInput").attr("checked", "checked");
		}
	}
	
	if(backgroundPage.Settings.getValue("soundAlert", true)) {
		$("#soundAlertInput").attr("checked", "checked");
	}
	
	if(backgroundPage.Settings.getValue("animateAlert", false)) {
		$("#animateAlertInput").attr("checked", "checked");
	}
	
	if(backgroundPage.Settings.getValue("showPrice", true)) {
		$("#showPriceInput").attr("checked", "checked");
	}
	
	if(backgroundPage.Settings.getValue("showPicture", true)) {
		$("#showStockPicture").attr("checked", "checked");
	}
	
	if(backgroundPage.Settings.getValue("showSinaLink", false)) {
		$("#showSinaLinkInput").attr("checked", "checked");
	}
	
	$('.alertRow input[type=checkbox]').change(function(e) {
        var name = e.target.name;
        
        if (name == "displayAlert" && e.target.checked == true) {
        	if ( isWebkitHTMLNotificationsEnabled() ) {
	        	if(webkitNotifications.checkPermission() != 0) {
					webkitNotifications.requestPermission(function() {
						if(webkitNotifications.checkPermission() != 0) {
							e.target.checked = false;
						}
					});
				}
			}
        }
        backgroundPage.Settings.setValue(name, e.target.checked);
        backgroundPage.displayStocks();
        
        showMessage("自动保存成功");
    });

	$("textarea#txtStockNote").autoResize({
		defaultHeight: 88,
		animate: false,
		animateDuration : 300,
		extraSpace : 30,
		limit: 520
	});

	$("#btnNewStock").click(function() { newStockRow(undefined, true); });
	$("#btnLoadStock").click(function() { updateStockPrice(); });
	$("#btnSaveStock").click(function() { saveOptions(); });
	$("#btnBackOptions").click(function() { backOptionsPage(); });
	$("#btnSaveNote").click(function() { saveStockNote(); });
	$("#btnExportStock").click(function() { exportStock(); });
	$("#btnImportStock").click(function() { importStock(); });
	
	$("#stocksTable").delegate(".note", "click", function(){ showStockNote(); });
	$("#stocksTable").delegate(".delete", "click", function(){ deleteStockRow(); });
	$("#stocksTable").delegate(".flag", "click", function(){ flagStock(); });
	
	initializeStockRow();
	
	window.setTimeout(updateStockPriceLoop, 5000);
}
function initializeTabs() {
	$("ul.menu li:first").addClass("tabActive").show(); 
	$("#options > div").hide();
	$("#custom-stock-infos").show();
	
	$("ul.menu li").click(function() {

		$("ul.menu li").removeClass("tabActive"); 
		$(this).addClass("tabActive");
		$("#options > div").hide();
		
		var activeTab = $(this).find("a").attr("href");
		$(activeTab).fadeIn();
		return false;
	});
}
function initializeStockRow() {
	$("#stocksTable .tableRow").remove();
	var stockListStocks = Settings.getObject("stockListStocks");

	if (undefined != stockListStocks) {
		
		for (var i in stockListStocks) {
			var stock = stockListStocks[i];
			newStockRow(stock, false);
		}
	}
	else
		newStockRow(undefined, true);

	$("#stocksTable tr.tableRow:odd").addClass("odd");
	
	$("#stocksTable").tableDnD({
		onDragClass: "myDragClass",
        onDrop: function(table, row) {
            stopUpdateInfo = false;
            $("#stocksTable tr.tableRow:odd").addClass("odd");
            $("#stocksTable tr.tableRow:even").removeClass("odd");
        },
        onDragStart: function(table, row) {
			stopUpdateInfo = true;
		},
        dragHandle: "dragHandle"
    });
}
function setAutoComplete(input, row) {
	// http://suggest3.sinajs.cn/suggest/type=&key=flzc&name=gpdm
	input.autocomplete(stockInfos, {
			max: 5,
			minChars: 1,
			matchSubset: true,
			matchContains: true,
			autoFill: false,
			highlight: false,
			width: "118px",
			formatItem: function(item, i, max) { 
				return item.name + '┊' + item.code; 
			}, 
			formatMatch: function(item, i, max) { 
				return item.pyname + item.name + item.code;
			}, 
			formatResult: function(item) { 
				return item.name; 
			} 
		}).result(function(event, item, formatted) { 
			$(".stockName", row).text(item.name);
			$(".stockCode", row).text(item.code);
			updateStockInfo(row);
		}
	); 
}

function enterFieldEditMode(cell) {
	var input = $("input", cell);
	var span = $("span", cell);

	if (input.is(":visible") || input.html() == null)
		return;
					
	input.val(span.text());
	input.toggle();
	span.toggle();
	input.focus();
	
	if (input.attr("id") == "stockName")
		setAutoComplete(input, span.parent().parent().parent());
}

function exitFieldEditMode(cell) {
	var input = $("input", cell);
	var span = $("span", cell);
	var newValue = input.val();
	
	input.toggle();
	span.toggle();
	
	if (input.attr("id") != "stockName") {
		span.text(newValue);
	} else {
		var patrn=/^s[hz]{1}[0-9]{6}$/;
		if (patrn.exec(newValue)) {
			var row = span.parent().parent().parent();
			$(".stockCode", row).text(newValue);
			updateStockInfo(row);
		}
	}
	
	if (input.attr("id") != "stockName") {
		updateStockInfo(span.parent().parent().parent());
	}
}

function updateStockInfo(row) {
	if ($(".stockCode", row).text() == "")
		return;

	if (stopUpdateInfo == true)
		return;
	
	$(".stockPrice", row).html("<img alt=\"获取价格中\" src=\"images/loading.gif\" height=\"13px\">");
	getStockInfo($(".stockCode", row).text(), function(stockInfo, stockName) {
		if (stockInfo == undefined) {
			if ( $(".stockName", row).text() == "" ) {
				$(".stockCode", row).text("");
				$(".stockPrice", row).text("获取失败");
			}
		}
		else {
			if ( stockName != undefined ) $(".stockName", row).text(stockName);
			if (stockInfo.stockOpenPrice == 0) {	
				row.removeClass("stockUp").removeClass("stockDown").addClass("stockStop");
			}
			else {
				if (parseFloat(stockInfo.stockChangeAmt) >= 0) {
					row.removeClass("stockStop").removeClass("stockDown").addClass("stockUp");
				}
				else {
					row.removeClass("stockStop").removeClass("stockUp").addClass("stockDown");
				}
				
				stockCurrPrice = parseFloat(stockInfo.stockCurrPrice);
				
				oStockUpPrice = $(".stockUpPrice", row);
				stockUpPrice = parseFloat(oStockUpPrice.text());
				if (stockUpPrice != 0 && stockCurrPrice > stockUpPrice) {
					oStockUpPrice.addClass("stockUp");
				}
				else {
					oStockUpPrice.removeClass("stockUp");
				}
				
				oStockDownPrice = $(".stockDownPrice", row);
				stockDownPrice = parseFloat(oStockDownPrice.text());
				if ( stockDownPrice != 0 && stockCurrPrice < stockDownPrice) {
					oStockDownPrice.addClass("stockDown");
				}
				else {
					oStockDownPrice.removeClass("stockDown");
				}
			}
			
			$(".stockOpenPrice", row).text(stockInfo.stockOpenPrice);
			$(".stockClosePrice", row).text(stockInfo.stockClosePrice);
			$(".stockMaxPrice", row).text(stockInfo.stockMaxPrice);
			$(".stockMinPrice", row).text(stockInfo.stockMinPrice);
			
			if (parseFloat(stockInfo.stockOpenPrice) == 0) {
				$(".stockPrice", row).text("0.00");
				$(".stockChangeAmt", row).text("0.00");
				$(".stockChangeRate", row).text("0.00%");
			}
			else {
				$(".stockPrice", row).text(stockInfo.stockCurrPrice);
				
				if (stockInfo.stockChangeRate < 0) {
					$(".stockChangeAmt", row).text(stockInfo.stockChangeAmt);
					$(".stockChangeRate", row).html(stockInfo.stockChangeRate + "%");
				}
				else {
					$(".stockChangeAmt", row).text("+" + stockInfo.stockChangeAmt);
					$(".stockChangeRate", row).html("+" + stockInfo.stockChangeRate + "%");
				}
			}
		}
	});
}

function updateStockPriceLoop(){
	
	if (isOperation())
	{
		updateStockPrice();
	}
	window.setTimeout(updateStockPriceLoop, 5000);
}

function updateStockPrice() {
	$("#btnLoadStock").attr("disabled", "disabled"); 
	setTimeout(function() {
		var rows = $("#stocksTable .tableRow");
					
		for (var i = 0; i < rows.length; i++) {
			updateStockInfo($(rows[i]));
		}

		$("#btnLoadStock").attr("disabled", ""); 
	}, 0);
}

function newStockRow(stock, activate) {
	var table = $("#stocksTable");
	var row = $("#stocksTable .templateRow").clone();
	
	row.removeClass("templateRow").addClass("tableRow");	
	table.append(row);

	$("td", row).click(function() {
		enterFieldEditMode(this);
	});
	$("input", row).blur(function() {
		exitFieldEditMode(this.parentNode);
	}).keypress(function() {
		if (event.keyCode == 13) // Enter Key
			$(event.target).blur();
	});
	
	$(".stockCode", row).click(function() {
		openStockPage($(this).text());
	});
	
	if (stock) {
		$(".stockName", row).text(stock.stockName);
		$(".stockCode", row).html(stock.stockCode);
		$(".stockUpPrice", row).text(stock.stockUpPrice);
		$(".stockDownPrice", row).text(stock.stockDownPrice);

		if ( typeof(stock.stockFlag) != "undefined" && stock.stockFlag == 1 ) {
			$(".flag", row).addClass("remove").attr("title", "取消标记置顶");
		}
		else {
			$(".flag", row).addClass("add").attr("title", "标记置顶状态");;
		}
		
		if (Settings.getValue("note_" + stock.stockCode, "") != "") {
			$(".note", row).addClass("pressed");
		}
		updateStockInfo(row);
	}
	else {
		$(".dragHandle", row).removeClass("dragHandle").attr("title", "");
	}

	if (activate) {
		$("td:first", row).click();
		$("td:first input", row).select();
	}
}

function flagStock() {
	var oFlag = ($(event.target));
	if ( oFlag.hasClass("add") ) {
		oFlag.removeClass("add").addClass("remove").attr("title", "取消标记置顶");
		console.log("add");
	} 
	else if ( oFlag.hasClass("remove") ) {
		oFlag.removeClass("remove").addClass("add").attr("title", "标记置顶状态");
		console.log("remove");
	}

	console.log("flag");
}

function showStockNote() {
	var row = $(event.target.parentNode.parentNode);
	
	var stockCode = $(".stockCode", row).text();
	
	if (stockCode != "") {
		$("#noteTitle").text("“" + $(".stockName", row).text() + " | " + stockCode + "” 的备注：");
		
		if ($("textarea#txtStockNote").attr("tag") != stockCode) {
			$("textarea#txtStockNote").val(Settings.getValue("note_" + stockCode, "")).attr("tag", stockCode);
		}
		
		$("textarea#txtStockNote").focus();
	}
	
	$("#stocksTable").hide();
	$("#custom-stock-control").hide();
	$("#div-stock-note").show();
	$("#stock-note-control").show();
}

function backOptionsPage() {
	$("#div-stock-note").hide();
	$("#stock-note-control").hide();
	$("#stocksTable").show();
	$("#custom-stock-control").show();
}

function deleteStockRow() {
	var row = event.target.parentNode.parentNode;
	
	$(event.target).addClass("pressed");
	
	if (window.confirm("\n确实要删除该股票吗？"))
	{
		$(row).remove();
		$("#btnNewStock").show();
	}
	else
		$(event.target).removeClass("pressed");
}

function exportStock() {
	var stockListStocks = Settings.getObject("stockListStocks");
	var strStockInfo = JSON.stringify(stockListStocks);
	strStockInfo = strStockInfo.replace(/},/g, "},\r\n");
	
	var textarea = $("#txtBackup");
	textarea.val(strStockInfo);
	textarea.focus();
	textarea.select();
	
	showMessage("导出数据成功，请保存");
}

function importStock() {	
	var json = $("#txtBackup").val();
    if (json && json != "")
    {
        try {
			stockInfos = JSON.parse(json);
	
			if (undefined != stockInfos) {
				Settings.setObject("stockListStocks", stockInfos);
				
				Settings.setValue("popupStockPosition", 0);
				
				backgroundPage.reloadSock = true;
				backgroundPage.refreshStocks();
				
				initializeStockRow();
				
				saveOptions();
				
				showMessage("导入成功");
			}
        }
        catch(e) {
			console.log(e);
			showMessage("导入失败，请重试");
		}
    }
}
