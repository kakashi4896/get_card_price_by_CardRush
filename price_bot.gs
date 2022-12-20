// Run: html_test
var token="<your_line_token>";
var url_sheet='<your_detect_list_google_sheet_link>';
var line_msg="\n";
function main(){
  var SpreadSheet = SpreadsheetApp.openByUrl(url_sheet);
  var Sheet = SpreadSheet.getSheetByName('關注列表');
  var LastRow_watch = Sheet.getLastRow();
  for (let i = 1; i <= LastRow_watch; i++) {
    var list_watch=Sheet.getSheetValues(i,1,1,3)[0]
    Logger.log(list_watch);

    //沒有工作表的時候建立工作表
    if (SpreadSheet.getSheetByName(list_watch[0]) == null) {
      SpreadSheet.insertSheet(list_watch[0]);
    }
    html_test(list_watch);
  }

  if(line_msg!="\n"){
    sendMessage(line_msg);
  }
}

// Parse data===========================
function getContent_(url) {
  while(true){
    try{
      return UrlFetchApp.fetch(url).getContentText()
    }catch(error){
      console.log(error);
      Utilities.sleep(5 * 1000) //sleep 5 sec
    }
  }
}

function html_test(url_data) {
  const content = getContent_(url_data[1]);
  const $ = Cheerio.load(content);
  //Logger.log($('#pricech').text()); //用id搜尋(價錢)
  //Logger.log($('.detail_section.stock').text()); //用class搜尋(庫存)
  var card_price=Number($('#pricech').text().replace(/,/g, "").replace(/円/g, ""))
  var card_stock=Number($('.detail_section.stock').text().replace(/ /g, "").replace(/\n/g, "").replace(/在庫数/g, "").replace(/枚/g, ""))
  if (isNaN(card_stock)){
    card_stock=0;
  }
  Logger.log("card_price "+card_price+', card_stock '+card_stock);

  var date = new Date();
  var now = date.getFullYear() + '-' + parseInt(date.getMonth()+1) + '-' + date.getDate();
  doGet(
    {
      parameter:{
        data: now+','+card_price+','+card_stock,
        sheetUrl:url_sheet,
        sheetTag:url_data[0]
      }
    },card_price,card_stock,url_data[0]
  );
}

function get_last_value(Sheet,LastRow,card_price,card_stock,card_name){
  if (Number(LastRow)>=1){
    var data=Sheet.getSheetValues(LastRow,1,1,3);
    Logger.log(data[0]);//取得最後一行的值
    var last_price=Number(data[0][1]);
    var last_amount=Number(data[0][2]);
    var msg=card_name;
    if (last_price>card_price){
      msg=msg+" 跌價 "+(last_price-card_price)+" 円 ";
    }
    else if (last_price<card_price){
      msg=msg+" 漲價 "+(card_price-last_price)+" 円 ";
    }
    if (last_amount!=0 && card_stock==0){
      msg=msg+" 減少 "+(last_amount-card_stock)+" 張 完售了";
    }
    else if (last_amount==0 && card_stock!=0){
      msg=msg+" 增加 "+(card_stock-last_amount)+" 張 補貨了";
    }
    else if (last_amount<card_stock){
      msg=msg+" 增加 "+(card_stock-last_amount)+" 張"
    }
    else if (last_amount>card_stock){
      msg=msg+" 減少 "+(last_amount-card_stock)+" 張"
    }
    if(msg!=card_name){
      Logger.log(msg);
      line_msg=line_msg+msg+"("+card_price+"/"+card_stock+")\n"
    }
  }
}

// Write data=========================================
function doGet(e,card_price,card_stock,card_name) {
  var params = e.parameter;
  var data = params.data;

  var sheetUrl = params.sheetUrl;
  var sheetTag = params.sheetTag;

  var SpreadSheet = SpreadsheetApp.openByUrl(sheetUrl);
  var Sheet = SpreadSheet.getSheetByName(sheetTag);
  var LastRow = Sheet.getLastRow();

  //取得最後一筆資料進行比對
  get_last_value(Sheet,LastRow,card_price,card_stock,card_name)

  //寫入資料
  data = data.split(',');
  data.forEach(function(e,i){
    Sheet.getRange(LastRow+1, i+1).setValue(e);
  });

  //回傳處理完成
  return ContentService.createTextOutput(true);
}

// 發送訊息================================
function sendMessage(message) {
  var option = {
    method: 'post',
    headers: { Authorization: 'Bearer ' + token },
    payload: {
      // 這邊單純傳訊息，如果想要加上傳貼圖或圖片，就看參數自行新增
      message: message
    }
  };
  UrlFetchApp.fetch('https://notify-api.line.me/api/notify', option);
}
