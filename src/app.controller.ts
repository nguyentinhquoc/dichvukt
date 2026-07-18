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
import * as fs from 'fs';
import { join } from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import archiver from 'archiver';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompanyService } from './company/company.service';
interface UploadedFileType {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
@Controller()
@UseGuards(JwtAuthGuard)
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly companyService: CompanyService,
  ) { }

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


  @Get('hop-dong-mua-ban')
  @Render('hopdongmuaban')
  async hopDongMuaBan() {
    const companies = await this.companyService.findAll();
    return {
      title: 'Tạo hợp đồng mua bán',
      message: 'Upload file Excel của bạn để tạo hợp đồng mua bán',
      companies,
    };
  }

  // Đọc file Excel, gom theo SO_HD, trả về thông tin "Bên mua" thô lấy từ Excel (chưa render Word)
  private parseHopDongExcelContracts(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find(name => name === 'Smart_KTSC_OK') || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      blankrows: true,
    });
    const jsonDataGoc = rawData.map((row: any) => {
      const cleanRow: any = {};
      Object.keys(row).forEach(key => {
        if (!key.startsWith('__EMPTY')) {
          cleanRow[key] = row[key];
        }
      });
      return cleanRow;
    });

    const colAK = XLSX.utils.decode_col('AK');
    const colAL = XLSX.utils.decode_col('AL');
    const colAN = XLSX.utils.decode_col('AN');

    const getCellByCol = (dataRowIndex: number, colIndex: number) => {
      const addr = XLSX.utils.encode_cell({ r: dataRowIndex + 1, c: colIndex });
      return worksheet[addr]?.v ?? '';
    };

    const parseExcelDate = (val: any): { day: number; month: number; year: number } | null => {
      if (!val) return null;
      let d: Date;
      if (val instanceof Date) {
        d = val;
      } else if (typeof val === 'number') {
        d = new Date((val - 25569) * 86400000);
      } else {
        d = new Date(val);
        if (isNaN(d.getTime())) return null;
      }
      return { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
    };

    const seenSoHD = new Set<string>();
    const contracts: {
      soHD: string;
      ngay: number | string;
      thang: number | string;
      nam: number | string;
      ten_cty: string;
      mst: string;
      dia_chi: string;
    }[] = [];

    jsonDataGoc.forEach((row: any, index: number) => {
      const soHD = row.SO_HD?.toString().trim();
      if (!soHD || seenSoHD.has(soHD)) return;
      seenSoHD.add(soHD);

      const date = parseExcelDate(row.NGAY_KY) ?? { day: '', month: '', year: '' };

      contracts.push({
        soHD,
        ngay: date.day,
        thang: date.month,
        nam: date.year,
        ten_cty: getCellByCol(index, colAL),
        mst: getCellByCol(index, colAK),
        dia_chi: getCellByCol(index, colAN),
      });
    });

    return contracts;
  }

  // Dùng cho trang "Tạo hợp đồng mua bán": xem trước thông tin Bên mua lấy từ Excel để hiển thị input cho sửa
  @Post('hop-dong-mua-ban/preview-excel')
  @UseInterceptors(FileInterceptor('file'))
  previewHopDongMuaBan(@UploadedFile() file: UploadedFileType) {
    if (!file) return { contracts: [] };
    const contracts = this.parseHopDongExcelContracts(file.buffer);
    return { contracts };
  }

  @Post('hop-dong-mua-ban/upload-excel')
  @UseInterceptors(FileInterceptor('file'))
  async uploadHopDongMuaBan(
    @UploadedFile() file: UploadedFileType,
    @Body('companyId') companyId: string,
    @Body('thongTinBanJson') thongTinBanJson: string,
    @Body('benMuaJson') benMuaJson: string,
    @Res() res: any,
  ) {
    const companies = await this.companyService.findAll();
    if (!file) {
      return res.render('hopdongmuaban', {
        title: 'Tạo hợp đồng mua bán',
        message: 'Upload file Excel của bạn để tạo hợp đồng mua bán',
        error: 'Không có file nào được tải lên',
        companies,
      });
    }

    // Thông tin "Bên bán": tên công ty luôn lấy tươi từ DB (không cho sửa).
    // Danh sách nhãn/giá trị mặc định lấy từ DB, nhưng nếu người dùng đã chỉnh sửa
    // trên trang thì dùng bản đã sửa đó thay thế - việc sửa ở đây không ghi lại vào DB.
    const benBanData: Record<string, any> = { ten_cty_ban: '', thong_tin_ban: [] };
    if (companyId) {
      const company = await this.companyService.findOne(Number(companyId));
      Object.assign(benBanData, this.companyService.buildTemplateData(company));
    }
    if (thongTinBanJson) {
      try {
        const parsed = JSON.parse(thongTinBanJson);
        if (Array.isArray(parsed)) {
          benBanData.thong_tin_ban = parsed
            .filter((row: any) => row && row.label)
            .map((row: any) => ({ label: String(row.label), value: String(row.value ?? '') }));
        }
      } catch {
        // JSON không hợp lệ -> giữ nguyên danh sách mặc định lấy từ DB
      }
    }

    // Thông tin "Bên mua": mặc định lấy từ Excel (tên công ty, MST, địa chỉ theo từng SO_HD),
    // "Đại diện" mặc định rỗng và "Chức vụ" mặc định "Giám đốc". Không có bảng database cho bên mua -
    // nếu người dùng đã sửa trên trang (benMuaJson) thì dùng bản đã sửa đó thay cho dữ liệu Excel gốc.
    const excelContracts = this.parseHopDongExcelContracts(file.buffer);
    const benMuaOverrideBySoHD = new Map<string, any>();
    if (benMuaJson) {
      try {
        const parsed = JSON.parse(benMuaJson);
        if (Array.isArray(parsed)) {
          parsed.forEach((row: any) => {
            if (row && row.soHD) benMuaOverrideBySoHD.set(String(row.soHD).trim(), row);
          });
        }
      } catch {
        // JSON không hợp lệ -> bỏ qua, dùng nguyên dữ liệu Excel
      }
    }

    const contracts = excelContracts.map((excelContract) => {
      const override = benMuaOverrideBySoHD.get(excelContract.soHD);
      return {
        soHD: excelContract.soHD,
        data: {
          so_hd: excelContract.soHD,
          ngay: excelContract.ngay,
          thang: excelContract.thang,
          nam: excelContract.nam,
          ten_cty: override?.ten_cty ?? excelContract.ten_cty,
          mst: override?.mst ?? excelContract.mst,
          dia_chi: override?.dia_chi ?? excelContract.dia_chi,
          dai_dien: override?.dai_dien ?? '',
          chuc_vu: override?.chuc_vu ?? 'Giám đốc',
          ...benBanData,
        },
      };
    });

    if (contracts.length === 0) {
      return res.render('hopdongmuaban', {
        title: 'Tạo hợp đồng mua bán',
        message: 'Upload file Excel của bạn để tạo hợp đồng mua bán',
        error: 'Không tìm thấy số hợp đồng (SO_HD) hợp lệ trong file',
        companies,
      });
    }

    const templatePath = join(__dirname, '..', 'templates', 'hop-dong-mua-ban-template.docx');
    const templateContent = fs.readFileSync(templatePath, 'binary');

    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));

    for (const contract of contracts) {
      const zip = new PizZip(templateContent);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      doc.render(contract.data);
      const buffer = doc.getZip().generate({ type: 'nodebuffer' });
      archive.append(buffer, { name: `HopDong_${contract.soHD}.docx` });
    }

    await archive.finalize();
    const zipBuffer = Buffer.concat(chunks);

    const now = new Date();
    const dateHienTai = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="HopDongMuaBan_${dateHienTai}.zip"`,
    });
    res.send(zipBuffer);
  }

  @Get('don-dat-hang-dich')
  @Render('don-dat-hang-dich')
  donDatHangDich() {
    return {
      title: 'Tạo đơn đặt hàng',
      message: 'Upload file Excel của bạn để tạo đơn đặt hàng',
    };
  }

  @Post('don-dat-hang-dich/upload-excel')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDonDatHangDich(@UploadedFile() file: UploadedFileType, @Res() res: any) {
    if (!file) {
      return res.render('don-dat-hang-dich', {
        title: 'Tạo đơn đặt hàng',
        message: 'Upload file Excel của bạn để tạo đơn đặt hàng',
        error: 'Không có file nào được tải lên',
      });
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find(name => name === 'Smart_KTSC_OK') || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      blankrows: true,
    });
    const jsonDataGoc = rawData.map((row: any) => {
      const cleanRow: any = {};
      Object.keys(row).forEach(key => {
        if (!key.startsWith('__EMPTY')) {
          cleanRow[key] = row[key];
        }
      });
      return cleanRow;
    });

    const colF = XLSX.utils.decode_col('F');
    const colR = XLSX.utils.decode_col('R');
    const colU = XLSX.utils.decode_col('U');
    const colV = XLSX.utils.decode_col('V');
    const colZ = XLSX.utils.decode_col('Z');
    const colAA = XLSX.utils.decode_col('AA');
    const colAL = XLSX.utils.decode_col('AL');
    const colAN = XLSX.utils.decode_col('AN');

    const getCellByCol = (sheet: XLSX.WorkSheet, dataRowIndex: number, colIndex: number) => {
      const addr = XLSX.utils.encode_cell({ r: dataRowIndex + 1, c: colIndex });
      return sheet[addr]?.v ?? '';
    };

    const parseExcelDate = (val: any): { day: number; month: number; year: number } | null => {
      if (!val) return null;
      let d: Date;
      if (val instanceof Date) {
        d = val;
      } else if (typeof val === 'number') {
        d = new Date((val - 25569) * 86400000);
      } else {
        d = new Date(val);
        if (isNaN(d.getTime())) return null;
      }
      return { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
    };

    const formatSoTien = (val: number) => Number(val || 0).toLocaleString('en-US');

    // "Kính gửi" lấy ở cột C của sheet HoaDon_TongQuat, dữ liệu bắt đầu từ dòng 5
    // (dòng 1: tiêu đề "HÓA ĐƠN BÁN RA", dòng 2: MST, dòng 3: Tên DN, dòng 4: header cột)
    // Giá trị cột C giống nhau ở mọi dòng dữ liệu nên chỉ cần lấy dòng đầu tiên (dòng 5)
    const hoaDonTongQuatSheetName = workbook.SheetNames.find(name => name === 'HoaDon_TongQuat');
    let kinhGui = '';
    if (hoaDonTongQuatSheetName) {
      const hoaDonTongQuatSheet = workbook.Sheets[hoaDonTongQuatSheetName];
      kinhGui = hoaDonTongQuatSheet['C5']?.v ?? '';
    }

    const seenSoHD = new Set<string>();
    const orders: { soHD: string; data: any }[] = [];

    jsonDataGoc.forEach((row: any, index: number) => {
      const soHD = row.SO_HD?.toString().trim();
      if (!soHD || seenSoHD.has(soHD)) return;
      seenSoHD.add(soHD);

      const date = parseExcelDate(getCellByCol(worksheet, index, colF)) ?? { day: '', month: '', year: '' };
      const thoiGianGiaoHang = date.day !== ''
        ? `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`
        : '';

      const chiTietRaw = jsonDataGoc
        .map((r: any, i: number) => ({ r, i }))
        .filter(({ r }) => r.SO_HD?.toString().trim() === soHD)
        .map(({ i }, stt) => ({
          stt: stt + 1,
          ten_sp: getCellByCol(worksheet, i, colR),
          dvt: getCellByCol(worksheet, i, colU),
          sl: Number(getCellByCol(worksheet, i, colV)) || 0,
          don_gia: Math.round(getCellByCol(worksheet, i, colZ)) || 0,
          thanh_tien: Math.round(getCellByCol(worksheet, i, colAA)) || 0,
        }));

      const tongCong = chiTietRaw.reduce((sum, item) => sum + item.thanh_tien, 0);

      const chiTiet = chiTietRaw.map(item => ({
        ...item,
        sl: formatSoTien(item.sl),
        don_gia: formatSoTien(item.don_gia),
        thanh_tien: formatSoTien(item.thanh_tien),
      }));

      orders.push({
        soHD,
        data: {
          so_hd: soHD,
          kinh_gui: kinhGui,
          ten_cty: getCellByCol(worksheet, index, colAL),
          thoi_gian_giao_hang: thoiGianGiaoHang,
          dia_diem_giao_hang: getCellByCol(worksheet, index, colAN),
          ngay: date.day,
          thang: date.month,
          nam: date.year,
          chi_tiet: chiTiet,
          tong_cong: formatSoTien(tongCong),
        },
      });
    });

    if (orders.length === 0) {
      return res.render('don-dat-hang-dich', {
        title: 'Tạo đơn đặt hàng',
        message: 'Upload file Excel của bạn để tạo đơn đặt hàng',
        error: 'Không tìm thấy số hóa đơn (SO_HD) hợp lệ trong file',
      });
    }

    const templatePath = join(__dirname, '..', 'templates', 'don-dat-hang-dich-template.docx');
    const templateContent = fs.readFileSync(templatePath, 'binary');

    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));

    for (const order of orders) {
      const zip = new PizZip(templateContent);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      doc.render(order.data);
      const buffer = doc.getZip().generate({ type: 'nodebuffer' });
      archive.append(buffer, { name: `DonDatHang_${order.soHD}.docx` });
    }

    await archive.finalize();
    const zipBuffer = Buffer.concat(chunks);

    const now = new Date();
    const dateHienTai = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="DonDatHangDich_${dateHienTai}.zip"`,
    });
    res.send(zipBuffer);
  }

  @Get('bien-ban-giao-nhan-hang-hoa')
  @Render('bien-ban-giao-nhan-hang-hoa')
  bienBanGiaoNhanHangHoa() {
    return {
      title: 'Tạo biên bản giao nhận hàng hóa',
      message: 'Upload file Excel của bạn để tạo biên bản giao nhận hàng hóa',
    };
  }

  @Post('bien-ban-giao-nhan-hang-hoa/upload-excel')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBienBanGiaoNhanHangHoa(@UploadedFile() file: UploadedFileType, @Res() res: any) {
    if (!file) {
      return res.render('bien-ban-giao-nhan-hang-hoa', {
        title: 'Tạo biên bản giao nhận hàng hóa',
        message: 'Upload file Excel của bạn để tạo biên bản giao nhận hàng hóa',
        error: 'Không có file nào được tải lên',
      });
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find(name => name === 'Smart_KTSC_OK') || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      blankrows: true,
    });
    const jsonDataGoc = rawData.map((row: any) => {
      const cleanRow: any = {};
      Object.keys(row).forEach(key => {
        if (!key.startsWith('__EMPTY')) {
          cleanRow[key] = row[key];
        }
      });
      return cleanRow;
    });

    const colD = XLSX.utils.decode_col('D');
    const colE = XLSX.utils.decode_col('E');
    const colH = XLSX.utils.decode_col('H');
    const colR = XLSX.utils.decode_col('R');
    const colU = XLSX.utils.decode_col('U');
    const colV = XLSX.utils.decode_col('V');
    const colAL = XLSX.utils.decode_col('AL');
    const colAN = XLSX.utils.decode_col('AN');

    const getCellByCol = (sheet: XLSX.WorkSheet, dataRowIndex: number, colIndex: number) => {
      const addr = XLSX.utils.encode_cell({ r: dataRowIndex + 1, c: colIndex });
      return sheet[addr]?.v ?? '';
    };

    const parseExcelDate = (val: any): { day: number; month: number; year: number } | null => {
      if (!val) return null;
      let d: Date;
      if (val instanceof Date) {
        d = val;
      } else if (typeof val === 'number') {
        d = new Date((val - 25569) * 86400000);
      } else {
        d = new Date(val);
        if (isNaN(d.getTime())) return null;
      }
      return { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
    };

    // "Công ty" và "Địa chỉ" bên giao hàng lấy ở cột C, D của sheet HoaDon_TongQuat, dữ liệu bắt đầu từ dòng 5
    // (dòng 1: tiêu đề "HÓA ĐƠN BÁN RA", dòng 2: MST, dòng 3: Tên DN, dòng 4: header cột)
    // Giá trị cột C, D giống nhau ở mọi dòng dữ liệu nên chỉ cần lấy dòng đầu tiên (dòng 5)
    const hoaDonTongQuatSheetName = workbook.SheetNames.find(name => name === 'HoaDon_TongQuat');
    let tenCtyB = '';
    let diaChiB = '';
    if (hoaDonTongQuatSheetName) {
      const hoaDonTongQuatSheet = workbook.Sheets[hoaDonTongQuatSheetName];
      tenCtyB = hoaDonTongQuatSheet['C5']?.v ?? '';
      diaChiB = hoaDonTongQuatSheet['D5']?.v ?? '';
    }

    const seenSoHD = new Set<string>();
    const bienBans: { soHD: string; data: any }[] = [];

    jsonDataGoc.forEach((row: any, index: number) => {
      const soHD = row.SO_HD?.toString().trim();
      if (!soHD || seenSoHD.has(soHD)) return;
      seenSoHD.add(soHD);

      const dateE = parseExcelDate(getCellByCol(worksheet, index, colE)) ?? { day: '', month: '', year: '' };
      const ngayDatHang = dateE.day !== ''
        ? `${String(dateE.day).padStart(2, '0')}/${String(dateE.month).padStart(2, '0')}/${dateE.year}`
        : '';
      const dateH = parseExcelDate(getCellByCol(worksheet, index, colH)) ?? { day: '', month: '', year: '' };

      const chiTiet = jsonDataGoc
        .map((r: any, i: number) => ({ r, i }))
        .filter(({ r }) => r.SO_HD?.toString().trim() === soHD)
        .map(({ i }, stt) => ({
          stt: stt + 1,
          ten_sp: getCellByCol(worksheet, i, colR),
          dvt: getCellByCol(worksheet, i, colU),
          sl: getCellByCol(worksheet, i, colV),
        }));

      bienBans.push({
        soHD,
        data: {
          ten_cty_b: tenCtyB,
          dia_chi_b: diaChiB,
          ten_cty_a: getCellByCol(worksheet, index, colAL),
          dia_chi_a: getCellByCol(worksheet, index, colAN),
          so_bb: getCellByCol(worksheet, index, colD),
          ngay_e: dateE.day,
          thang_e: dateE.month,
          nam_e: dateE.year,
          ngay_dat_hang: ngayDatHang,
          ngay_h: dateH.day,
          thang_h: dateH.month,
          nam_h: dateH.year,
          chi_tiet: chiTiet,
        },
      });
    });

    if (bienBans.length === 0) {
      return res.render('bien-ban-giao-nhan-hang-hoa', {
        title: 'Tạo biên bản giao nhận hàng hóa',
        message: 'Upload file Excel của bạn để tạo biên bản giao nhận hàng hóa',
        error: 'Không tìm thấy số hóa đơn (SO_HD) hợp lệ trong file',
      });
    }

    const templatePath = join(__dirname, '..', 'templates', 'bien-ban-xac-nha-hang-hoa-template.docx');
    const templateContent = fs.readFileSync(templatePath, 'binary');

    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));

    for (const bienBan of bienBans) {
      const zip = new PizZip(templateContent);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      doc.render(bienBan.data);
      const buffer = doc.getZip().generate({ type: 'nodebuffer' });
      archive.append(buffer, { name: `BienBanGiaoNhan_${bienBan.soHD}.docx` });
    }

    await archive.finalize();
    const zipBuffer = Buffer.concat(chunks);

    const now = new Date();
    const dateHienTai = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="BienBanGiaoNhanHangHoa_${dateHienTai}.zip"`,
    });
    res.send(zipBuffer);
  }

  @Get('about')
  @Render('about')
  getAbout() {
    return {
      title: 'Giới thiệu',
    };
  }
}
