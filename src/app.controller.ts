import {
  Body,
  Controller,
  Get,
  Post,
  Render,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
  Res,
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
  @UseGuards()
  root(@Req() req: any, @Res() res: any) {
    const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];

    if (token) {
      return res.redirect('/tao-phieu-nhap');
    } else {
      return res.redirect('/auth/login');
    }
  }


  @Get("tao-phieu-nhap")
  @Render('index')
  getHello() {
    return {
      title: 'Công cụ xem file Excel',
      message: 'Upload file Excel của bạn để xem dữ liệu',
    };
  }

    @Post('tao-phieu-nhap/upload-excel')
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
        const sheetName = workbook.SheetNames.find(name => name === 'Smart_KTSC_OK') || workbook.SheetNames[0];

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
          'Ngày chứng từ (*)': isSoHDDuplicate ? '' : (() => {
                const d = new Date();
                return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
              })(),          
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
          'Mã lô (*)': (() => {
            const d = new Date();
            return `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
          })(),          'Ngày sản xuất': '',
          'Hạn sử dụng': '',
          'Lượng hàng (*)': row.LUONG
        };


      });
      const khacHang = jsonDataGoc.map((row: any) => ({
        "Mã KH/NCC":row.MAKH,
        "Tên đơn vị (*)	":row.TENKH,
        "Tên người mua":"",	
        "Loại (*)":"Nhà cung cấp",
        "Địa chỉ":row.DIACHI_NGD,
        "Số điện thoại":"",
          "Ngày sinh":"",
            "Số CCCD":"",
              "Mã số thuế":row.MS_DN,
                "Email":"",
                  "Số tài khoản":"",
                    "Tên ngân hàng":"",
                      "Giới tính":"",
                        "Mô tả":"",

      }));
        console.log("🚀 ~ AppController ~ uploadExcel ~ jsonDataGoc:", jsonDataGoc)
        return {
          jsonDataGoc,
          danhMucSanPham,
          tyGiaThayDoi,
          nhapLieu,
          khacHang
        };
    };


  @Get("don-vi-tinh")
  @Render('donvitinh')
  donViTinh() {
    return {
      title: 'Công cụ tạo phiếu nhập',
      message: 'Upload file Excel của bạn để xem dữ liệu',
    };
  }


  
  @Post('don-vi-tinh/upload-excel')
    @Render('donvitinh')
    @UseInterceptors(FileInterceptor('file'))
    uploadExceldonViTinh(@UploadedFile() file: UploadedFileType) {
      if (!file) {
          return {
            title: 'Công cụ xem file Excel',
            message: 'Vui lòng chọn một file',
            error: 'Không có file nào được tải lên',
          };
        }
         const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        // Tìm sheet "Smart_KTSC_OK", nếu không có dùng sheet đầu tiên
        const sheetName = workbook.SheetNames.find(name => name === 'Smart_KTSC_OK') || workbook.SheetNames[0];
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
        const sanitize = (str: string) => {
          if (!str) return '';
          return str
            .toString()
            .normalize('NFC')
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase();
        };

        const dataCheck = jsonDataGoc
          .map((row: any, index: number) => {
            const donvi = row.DONVI?.toString().trim();
            if (!donvi) return null;

            const madmnoNormalized = sanitize(row.MADMNO);
            const donviSet = new Set(
              jsonDataGoc
                .filter(r => sanitize(r.MADMNO) === madmnoNormalized && r.DONVI?.toString().trim())
                .map(r => sanitize(r.DONVI))
            );

            if (donviSet.size <= 1) return null;
            console.log(`🔴 Lỗi: MADMNO=${row.MADMNO} có multiple DONVI:`, Array.from(donviSet));

            const formatDate = (val: any) => {
              if (!val) return '';
              if (val instanceof Date) {
                const year = val.getFullYear();
                const month = String(val.getMonth() + 1).padStart(2, '0');
                const day = String(val.getDate()).padStart(2, '0');
                return `${day}/${month}/${year}`;
              }
              if (typeof val === 'number') {
                const utcDate = new Date((val - 25569) * 86400000);
                const year = utcDate.getFullYear();
                const month = String(utcDate.getMonth() + 1).padStart(2, '0');
                const day = String(utcDate.getDate()).padStart(2, '0');
               
                return `${day}/${month}/${year}`;
              }
              return val.toString();
            };

            return {
              DONG: index + 2,
              SOCT :row.SOCT,
              MADMNO: row.MADMNO,
              TENDM: row.TENDM,
              DONVI: row.DONVI,
              Status: '❌ Lỗi: Đơn vị khác',
              NGAYCT: formatDate(row.NGAYCT)
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => a.MADMNO.localeCompare(b.MADMNO));
          

           const dataCheck2 = jsonDataGoc
          .map((row: any, index: number) => {
            const donvi = row.DONVI_CTU?.toString().trim();
            if (!donvi) return null;

            const madmnoNormalized = sanitize(row.MADMNO);
            const donviSet = new Set(
              jsonDataGoc
                .filter(r => sanitize(r.MADMNO) === madmnoNormalized && r.DONVI_CTU?.toString().trim())
                .map(r => sanitize(r.DONVI_CTU))
            );

            if (donviSet.size <= 1) return null;

            const formatDate = (val: any) => {
              if (!val) return '';
              if (val instanceof Date) {
                const year = val.getFullYear();
                const month = String(val.getMonth() + 1).padStart(2, '0');
                const day = String(val.getDate()).padStart(2, '0');
                return `${day}/${month}/${year}`;
              }
              if (typeof val === 'number') {
                const utcDate = new Date((val - 25569) * 86400000);
                const year = utcDate.getFullYear();
                const month = String(utcDate.getMonth() + 1).padStart(2, '0');
                const day = String(utcDate.getDate()).padStart(2, '0');
                return `${day}/${month}/${year}`;
              }
              return val.toString();
            };

            return {
              DONG: index + 2,
              SOCT :row.SOCT,
              MADMNO: row.MADMNO,
              TENDM: row.TENDM,
              DONVI_CTU: row.DONVI_CTU,
              Status: '❌ Lỗi: Đơn vị khác',
              NGAYCT: formatDate(row.NGAYCT)
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => a.MADMNO.localeCompare(b.MADMNO));
          
        return {
          jsonDataGoc,
          dataCheck,
          dataCheck2
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
