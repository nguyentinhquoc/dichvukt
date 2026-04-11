import {
  Body,
  Controller,
  Get,
  Post,
  Render,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import * as XLSX from 'xlsx';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
interface UploadedFileType {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
@Controller()
@UseGuards(JwtAuthGuard)
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @Render('index')
  getHello() {
    return {
      title: 'Công cụ xem file Excel',
      message: 'Upload file Excel của bạn để xem dữ liệu',
    };
  }

    @Post('upload-excel')
    @Render('index')
    @UseInterceptors(FileInterceptor('file'))
    uploadExcel(@UploadedFile() file: UploadedFileType, @Body('tyGiaThayDoi') tyGiaThayDoi: number) {
      if (!file) {
          return {
            title: 'Công cụ xem file Excel',
            message: 'Vui lòng chọn một file',
            error: 'Không có file nào được tải lên',
          };
        }
         const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        // Lấy sheet đầu tiên
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Chuyển đổi sang JSON với các cột rỗng vẫn có giá trị
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
          defval: '', // Các ô trống sẽ có giá trị là chuỗi rỗng
          blankrows: true // Giữ cả các dòng trống
        });
        // Loại bỏ các cột __EMPTY
        const jsonDataGoc = rawData.map((row: any) => {
          const cleanRow: any = {};
          Object.keys(row).forEach(key => {
            if (!key.startsWith('__EMPTY')) {
              cleanRow[key] = row[key];
            }
          });
          return cleanRow;
        });
        const danhMucSanPham = jsonDataGoc.map((row: any) => ({
          'Mã sản phẩm (*)': row.MADMNO,
          'Tên sản phẩm (*)': row.TENDM,
          'Barcode': '',
          'Nhóm sản phẩm': '',
          'Giá nhập': Math.round(row.DGVND),
          'Giá bán (*)': Math.round(row.DGVND * (1 + tyGiaThayDoi / 100)),  
          'Đơn vị tính': row.DONVI,
          'Theo dõi hàng tồn kho': 'Có',
          'Số lượng tồn kho' : '0',
          'Hạn mức tồn': '',
          'Áp dụng thuế': '',
          'Ảnh': '',
          'Mô tả': '',
          'Thuế giảm trừ': '',
          'Nhóm ngành nghề tính thuế': ''
        }));
      const nhapLieu = jsonDataGoc.map((row: any, index: number) => {
      const isSoHDDuplicate = index > 0 && jsonDataGoc[index - 1].SO_HD === row.SO_HD;
        return {
          'Số chứng từ (*)': isSoHDDuplicate ? '' : row.SO_HD,
            'Ngày chứng từ (*)': isSoHDDuplicate ? '' : new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          'Mã đối tượng': isSoHDDuplicate ? '' : row.MAKH,
          'Tên đối tượng': isSoHDDuplicate ? '' : row.TENKH,
          'Tổng tiền hàng': isSoHDDuplicate ? '' : Math.round(row.TTVND_TT),
          'Chiết khấu': '',
          'Chi phí phát sinh': '',
          'Mô tả': '',
          'Hình thức thanh toán': '', 
          'Mã hàng': row.MADMNO,
          'Tên hàng (*)': row.TENDM,
          'ĐVT': row.DONVI,
          'Số lượng (*)': row.LUONG,
          'Đơn giá': row.DGVND,
          'Thành tiền': Math.round(row.TTVND),
            'Mã lô (*)': new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ''), // ngày hiện tại ví dụ 09/04/2026 thì sẽ là 09042026
          'Ngày sản xuất': '',
          'Hạn sử dụng': '',
          'Lượng hàng (*)': row.LUONG
        };
      });
        console.log("🚀 ~ AppController ~ uploadExcel ~ jsonDataGoc:", jsonDataGoc)
        return {
          jsonDataGoc,
          danhMucSanPham,
          tyGiaThayDoi,
          nhapLieu
        };
    };

  // 'Số chứng từ (*)': row.SO_HD,
 	// 'Ngày chứng từ (*)': new Date().toLocaleDateString('vi-VN'), // Ngày hiện tại định dạng 09/04/2026
 	// 'Mã đối tượng': row.MAKH,
 	// 'Tên đối tượng': row.TENKH,
 	// 'Tổng tiền hàng': Math.round(row.TTVND_TT),
 	// 'Chiết khấu': '',
 	// 'Chi phí phát sinh': '',
 	// 'Mô tả': '',
 	// 'Hình thức thanh toán': '',
 	// 'Mã hàng': row.MAHANG,
 	// 'Tên hàng (*)': row.TENDM,
 	// 'ĐVT': row.DONVI,
 	// 'Số lượng (*)': row.LUONG,
 	// 'Đơn giá': row.DGVND,
 	// 'Thành tiền': Math.round(row.TTVND),
 	// 'Mã lô (*)': row.MALO,
 	// 'Ngày sản xuất': '',
 	// 'Hạn sử dụng': '',
 	// 'Lượng hàng (*)': row.LUONG // Bằng cột M. Số lượng nhập tại sheet này 


  @Get('about')
  @Render('about')
  getAbout() {
    return {
      title: 'Giới thiệu',
    };
  }
}
