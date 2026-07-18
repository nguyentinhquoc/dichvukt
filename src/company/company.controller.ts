import { Body, Controller, Get, Param, Post, Render, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyService } from './company.service';

@Controller('cong-ty')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @Render('cong-ty')
  async list() {
    const companies = await this.companyService.findAll();
    return {
      title: 'Quản lý công ty',
      companies,
    };
  }

  // Dùng cho trang "Tạo hợp đồng mua bán": load danh sách label/value của 1 công ty qua AJAX
  @Get(':id/thong-tin')
  async infoJson(@Param('id') id: string) {
    const company = await this.companyService.findOne(Number(id));
    return {
      ten_cty_ban: company.title,
      thong_tin_ban: (company.infos || []).map((info) => ({
        label: info.label,
        value: info.value,
      })),
    };
  }

  @Post()
  async create(@Body('title') title: string, @Res() res: any) {
    if (title?.trim()) {
      await this.companyService.createCompany(title.trim());
    }
    return res.redirect('/cong-ty');
  }

  @Post(':id/rename')
  async rename(@Param('id') id: string, @Body('title') title: string, @Res() res: any) {
    if (title?.trim()) {
      await this.companyService.updateCompanyTitle(Number(id), title.trim());
    }
    return res.redirect('/cong-ty');
  }

  @Post(':id/delete')
  async remove(@Param('id') id: string, @Res() res: any) {
    await this.companyService.deleteCompany(Number(id));
    return res.redirect('/cong-ty');
  }

  @Post(':id/info')
  async addInfo(
    @Param('id') id: string,
    @Body('label') label: string,
    @Body('value') value: string,
    @Body('order') order: string,
    @Res() res: any,
  ) {
    if (label?.trim()) {
      await this.companyService.addInfo(Number(id), label.trim(), value?.trim() ?? '', Number(order) || 0);
    }
    return res.redirect('/cong-ty');
  }

  @Post('info/:infoId/update')
  async updateInfo(
    @Param('infoId') infoId: string,
    @Body('label') label: string,
    @Body('value') value: string,
    @Body('order') order: string,
    @Res() res: any,
  ) {
    if (label?.trim()) {
      await this.companyService.updateInfo(Number(infoId), label.trim(), value?.trim() ?? '', Number(order) || 0);
    }
    return res.redirect('/cong-ty');
  }

  @Post('info/:infoId/delete')
  async removeInfo(@Param('infoId') infoId: string, @Res() res: any) {
    await this.companyService.deleteInfo(Number(infoId));
    return res.redirect('/cong-ty');
  }
}
