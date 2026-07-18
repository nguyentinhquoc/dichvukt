import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { CompanyInfo } from '../entities/company-info.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(CompanyInfo)
    private infoRepository: Repository<CompanyInfo>,
  ) {}

  private sortInfos(company: Company) {
    (company.infos || []).sort((a, b) => a.order - b.order || a.id - b.id);
    return company;
  }

  async findAll() {
    const companies = await this.companyRepository.find({
      relations: ['infos'],
      order: { id: 'ASC' },
    });
    return companies.map((c) => this.sortInfos(c));
  }

  async findOne(id: number) {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['infos'],
    });
    if (!company) {
      throw new NotFoundException('Không tìm thấy công ty');
    }
    return this.sortInfos(company);
  }

  createCompany(title: string) {
    const company = this.companyRepository.create({ title });
    return this.companyRepository.save(company);
  }

  updateCompanyTitle(id: number, title: string) {
    return this.companyRepository.update(id, { title });
  }

  deleteCompany(id: number) {
    return this.companyRepository.delete(id);
  }

  addInfo(companyId: number, label: string, value: string, order: number) {
    const info = this.infoRepository.create({ companyId, label, value, order });
    return this.infoRepository.save(info);
  }

  updateInfo(id: number, label: string, value: string, order: number) {
    return this.infoRepository.update(id, { label, value, order });
  }

  deleteInfo(id: number) {
    return this.infoRepository.delete(id);
  }

  // Gộp toàn bộ label/value của 1 công ty (đã sort theo order) để đổ vào template docx.
  // Chỉ "Tên công ty" là nhãn cố định trong template, các dòng còn lại lấy label/value trực tiếp từ DB.
  buildTemplateData(company: Company) {
    return {
      ten_cty_ban: company.title,
      thong_tin_ban: (company.infos || []).map((info) => ({
        label: info.label,
        value: info.value,
      })),
    };
  }
}
