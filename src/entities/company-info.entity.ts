import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity('company_info')
export class CompanyInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  companyId: number;

  @ManyToOne(() => Company, (company) => company.infos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  label: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
