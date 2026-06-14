/**
 * code.gs - Google Apps Script Backend for Kopi Nusantara POS
 * 
 * Implements lazy-loaded paging pagination ("lazy page") for order lists,
 * stats calculation, order submission, updates, and deletion.
 * Supports native Apps Script direct calls as well as REST-like fetch API requests (CORS-friendly).
 * 
 * Author: awanhermawan78group@gmail.com
 * License: Apache-2.0
 */

function doGet(e) {
  // Check if JSONP callback is requested to bypass CORS completely
  var callback = e && e.parameter && e.parameter.callback;

  // If there's an action query parameter, act as an API endpoint (fetch GET / JSONP compatible)
  if (e && e.parameter && e.parameter.action) {
    try {
      var action = e.parameter.action;
      var responseData;
      
      if (action === 'getTodayDate') {
        responseData = getTodayDate();
      } else if (action === 'getAllOrders') {
        var offset = parseInt(e.parameter.offset, 10) || 0;
        var limit = parseInt(e.parameter.limit, 10) || 10;
        var statusFilter = e.parameter.statusFilter || 'all';
        responseData = getAllOrders(offset, limit, statusFilter);
      } else if (action === 'getOrdersByRange') {
        var dateFrom = e.parameter.dateFrom || '';
        var dateTo = e.parameter.dateTo || '';
        var offset = parseInt(e.parameter.offset, 10) || 0;
        var limit = parseInt(e.parameter.limit, 10) || 10;
        var statusFilter = e.parameter.statusFilter || 'all';
        responseData = getOrdersByRange(dateFrom, dateTo, offset, limit, statusFilter);
      } else if (action === 'submitOrder') {
        var data = JSON.parse(e.parameter.data || '{}');
        responseData = submitOrder(data);
      } else if (action === 'updateOrderMeta') {
        responseData = updateOrderMeta(e.parameter.orderId, e.parameter.status, e.parameter.paymentMethod);
      } else if (action === 'deleteOrder') {
        responseData = deleteOrder(e.parameter.orderId);
      } else {
        responseData = { success: false, message: 'Invalid GET action: ' + action };
      }

      var outputText = typeof responseData === 'string' ? JSON.stringify(responseData) : JSON.stringify(responseData);
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + outputText + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        return ContentService.createTextOutput(outputText)
          .setMimeType(ContentService.MimeType.JSON);
      }
    } catch (err) {
      var errOutput = JSON.stringify({ success: false, message: err.toString() });
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + errOutput + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      } else {
        return ContentService.createTextOutput(errOutput)
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
  }

  // Otherwise, fallback to rendering the spreadsheet integrated HTML UI
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('☕ Kopi Nusantara POS')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, user-scalable=no');
}

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var action = payload.action;
    var data = payload.data || {};
    var responseData;

    if (action === 'submitOrder') {
      responseData = submitOrder(data);
    } else if (action === 'updateOrderMeta') {
      responseData = updateOrderMeta(data.orderId, data.status, data.paymentMethod);
    } else if (action === 'deleteOrder') {
      responseData = deleteOrder(data.orderId);
    } else {
      responseData = { success: false, message: 'Invalid POST action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getTodayDate() {
  var d = new Date();
  var year = d.getFullYear();
  var month = ('0' + (d.getMonth() + 1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  return year + '-' + month + '-' + day;
}

function getOrCreateOrdersSheet() {
  // ==========================================
  // JIKA INGIN MENGGUNAKAN SPREADSHEET TERTENTU SECARA MANUAL (HARAL BARU):
  // Masukkan ID atau URL lengkap spreadsheet Anda ke dalam variabel di bawah ini.
  // Contoh: var MANUAL_SPREADSHEET_ID = "1aBcDeFg12345...";
  // Kosongkan "" jika ingin membuat otomatis / menggunakan script properties.
  var MANUAL_SPREADSHEET_ID = "1v3qXEYoKDXcK-F2YjJ7Tnpi9VuBW86us22PHRXiggVU";
  // ==========================================

  var ss;
  if (MANUAL_SPREADSHEET_ID) {
    try {
      if (MANUAL_SPREADSHEET_ID.indexOf('http') === 0) {
        ss = SpreadsheetApp.openByUrl(MANUAL_SPREADSHEET_ID);
      } else {
        ss = SpreadsheetApp.openById(MANUAL_SPREADSHEET_ID);
      }
    } catch (err) {
      throw new Error("Gagal membuka spreadsheet manual. Pastikan ID/URL benar dan script memiliki akses. Detail: " + err.toString());
    }
  } else {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) throw new Error("No active spreadsheet bound to this script.");
    } catch (e) {
      var properties = PropertiesService.getScriptProperties();
      var ssId = properties.getProperty('SPREADSHEET_ID');
      if (ssId) {
        try {
          if (ssId.indexOf('http') === 0) {
            ss = SpreadsheetApp.openByUrl(ssId);
          } else {
            ss = SpreadsheetApp.openById(ssId);
          }
        } catch (err) {
          ss = SpreadsheetApp.create('Kopi Nusantara POS Database');
          properties.setProperty('SPREADSHEET_ID', ss.getId());
        }
      } else {
        ss = SpreadsheetApp.create('Kopi Nusantara POS Database');
        properties.setProperty('SPREADSHEET_ID', ss.getId());
      }
    }
  }
  
  var sheet = ss.getSheetByName('Orders');
  if (!sheet) {
    sheet = ss.insertSheet('Orders');
    sheet.appendRow(['Order ID', 'Tanggal', 'Waktu', 'Items', 'Total Qty', 'Total', 'Payment Method', 'Status', 'Note']);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#a0784a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getOrdersFromSheet(filterFromDate, filterToDate) {
  var sheet = getOrCreateOrdersSheet();
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  var dataRows = rows.slice(1);
  var orders = [];
  
  for (var i = 0; i < dataRows.length; i++) {
    var r = dataRows[i];
    var orderId = String(r[0] || '');
    var tanggal = String(r[1] || ''); 
    var waktu = String(r[2] || '');
    var items = String(r[3] || '');
    var totalQty = Number(r[4] || 0);
    var total = Number(r[5] || 0);
    var paymentMethod = String(r[6] || '');
    var status = String(r[7] || 'Belum Bayar');
    var note = String(r[8] || '');
    
    if (tanggal && tanggal.indexOf('GMT') !== -1) {
      var d = new Date(tanggal);
      tanggal = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
    
    if (filterFromDate && tanggal < filterFromDate) continue;
    if (filterToDate && tanggal > filterToDate) continue;
    
    orders.push({ orderId: orderId, tanggal: tanggal, waktu: waktu, items: items, totalQty: totalQty, total: total, paymentMethod: paymentMethod, status: status, note: note });
  }
  
  orders.reverse();
  return orders;
}

function calculateBestSeller(orders) {
  var qty = {};
  orders.forEach(function(o) {
    var itemsStr = o.items || '';
    itemsStr.split(', ').forEach(function(p) {
      var parts = p.split(' x');
      if (parts.length === 2) {
        var name = parts[0].trim();
        var count = parseInt(parts[1], 10) || 0;
        qty[name] = (qty[name] || 0) + count;
      }
    });
  });
  
  var best = null;
  var max = 0;
  for (var k in qty) {
    if (qty[k] > max) { max = qty[k]; best = k; }
  }
  return best ? { name: best, qty: max } : null;
}

function submitOrder(data) {
  try {
    var sheet = getOrCreateOrdersSheet();
    var d = new Date();
    var pad = function(n) { return String(n).padStart(2, '0'); };
    var orderId = 'ORD-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    var tanggal = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    var waktu = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    
    var itemStrings = [];
    var totalQty = 0;
    if (data.items && data.items.length) {
      data.items.forEach(function(item) {
        itemStrings.push(item.name + ' x' + item.qty);
        totalQty += Number(item.qty);
      });
    }
    var itemsFormatted = itemStrings.join(', ');
    
    sheet.appendRow([orderId, tanggal, waktu, itemsFormatted, totalQty, Number(data.total), data.pay, data.status, data.note]);
    return { success: true, orderId: orderId };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function getAllOrders(offset, limit, statusFilter) {
  try {
    var allOrders = getOrdersFromSheet(null, null);
    return paginateAndSummarize(allOrders, offset, limit, statusFilter);
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function getOrdersByRange(dateFrom, dateTo, offset, limit, statusFilter) {
  try {
    var allOrders = getOrdersFromSheet(dateFrom, dateTo);
    return paginateAndSummarize(allOrders, offset, limit, statusFilter);
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function paginateAndSummarize(allOrders, offset, limit, statusFilter) {
  offset = parseInt(offset, 10) || 0;
  limit = parseInt(limit, 10) || 10;
  statusFilter = statusFilter || 'all';
  
  var totalRevenue = 0, totalCash = 0, totalQris = 0, totalCount = allOrders.length;
  
  allOrders.forEach(function(o) {
    totalRevenue += Number(o.total || 0);
    if (o.paymentMethod === 'QRIS') { totalQris += Number(o.total || 0); } else { totalCash += Number(o.total || 0); }
  });
  
  var bestSeller = calculateBestSeller(allOrders);
  
  var filteredOrders = allOrders;
  if (statusFilter !== 'all') {
    filteredOrders = allOrders.filter(function(o) { return o.status === statusFilter; });
  }
  
  var filteredCount = filteredOrders.length;
  var paginatedOrders = filteredOrders.slice(offset, offset + limit);
  var hasMore = (offset + limit) < filteredCount;
  
  return {
    success: true, orders: paginatedOrders, offset: offset, limit: limit, hasMore: hasMore, filteredCount: filteredCount,
    totalRevenue: totalRevenue, totalCash: totalCash, totalQris: totalQris, totalCount: totalCount, bestSeller: bestSeller
  };
}

function updateOrderMeta(orderId, status, paymentMethod) {
  try {
    var sheet = getOrCreateOrdersSheet();
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === String(orderId).trim()) {
        sheet.getRange(i + 1, 7).setValue(paymentMethod);
        sheet.getRange(i + 1, 8).setValue(status);
        SpreadsheetApp.flush();
        return { success: true };
      }
    }
    return { success: false, message: 'Order ID not found.' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function deleteOrder(orderId) {
  try {
    var sheet = getOrCreateOrdersSheet();
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === String(orderId).trim()) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        return { success: true };
      }
    }
    return { success: false, message: 'Order ID not found.' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}
