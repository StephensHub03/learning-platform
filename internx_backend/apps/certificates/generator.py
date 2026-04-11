"""
Certificate PDF generator using ReportLab.
Generates a professional PDF with:
  - InternX branding
  - Student name, course name, completion date
  - Unique certificate ID
  - QR code for verification
"""
import os
import io
import uuid
import qrcode
from django.conf import settings
from django.core.files.base import ContentFile
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
)
from reportlab.lib.enums import TA_CENTER


def generate_qr_code(url: str) -> io.BytesIO:
    """Generate a QR code image for the given URL."""
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color='#1e3a5f', back_color='white')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer


def generate_certificate_pdf(certificate) -> bytes:
    """
    Generate a styled PDF certificate.
    Returns raw PDF bytes.
    """
    buffer = io.BytesIO()
    page_size = landscape(A4)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=page_size,
        rightMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )

    styles = getSampleStyleSheet()
    elements = []

    # ── Colour palette ───────────────────────────────────────────────
    navy = colors.HexColor('#1e3a5f')
    gold = colors.HexColor('#c9a84c')
    light_bg = colors.HexColor('#f8f6f0')

    # ── Helper styles ────────────────────────────────────────────────
    def make_style(name, size, color, bold=False, align=TA_CENTER, space_before=0, space_after=6):
        return ParagraphStyle(
            name,
            fontName='Helvetica-Bold' if bold else 'Helvetica',
            fontSize=size,
            textColor=color,
            alignment=align,
            spaceBefore=space_before,
            spaceAfter=space_after,
        )

    header_style = make_style('Header', 36, navy, bold=True, space_before=20)
    sub_header_style = make_style('SubHeader', 14, gold)
    body_style = make_style('Body', 13, colors.HexColor('#333333'))
    name_style = make_style('Name', 32, navy, bold=True, space_before=10, space_after=10)
    course_style = make_style('Course', 20, gold, bold=True)
    small_style = make_style('Small', 10, colors.HexColor('#666666'), space_before=4)

    # ── Certificate content ──────────────────────────────────────────
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(Paragraph('🎓 InternX', header_style))
    elements.append(Paragraph('AI Internship Learning Platform', sub_header_style))
    elements.append(Spacer(1, 0.2 * inch))

    # Horizontal rule
    hr_data = [['']]
    hr_table = Table(hr_data, colWidths=[page_size[0] - 1 * inch])
    hr_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 2, gold),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(hr_table)
    elements.append(Spacer(1, 0.25 * inch))

    elements.append(Paragraph('CERTIFICATE OF COMPLETION', make_style('Cert', 16, navy, bold=True)))
    elements.append(Paragraph('This is to certify that', body_style))

    # Student name
    student_name = certificate.student.get_full_name()
    elements.append(Paragraph(student_name, name_style))

    elements.append(Paragraph('has successfully completed the course', body_style))

    # Course name
    elements.append(Paragraph(certificate.course.title, course_style))
    elements.append(Spacer(1, 0.2 * inch))

    # Date and certificate ID
    issued_date = certificate.issued_at.strftime('%B %d, %Y')
    elements.append(
        Paragraph(f'Issued on: <b>{issued_date}</b>', body_style)
    )
    elements.append(
        Paragraph(f'Certificate ID: <b>{certificate.certificate_id}</b>', small_style)
    )

    # QR code
    elements.append(Spacer(1, 0.2 * inch))
    qr_buffer = generate_qr_code(certificate.verification_url)
    qr_image = Image(qr_buffer, width=1.2 * inch, height=1.2 * inch)

    # Table: [spacer | QR | verify text]
    qr_data = [[
        Paragraph('', small_style),
        qr_image,
        Paragraph(f'Scan to verify<br/>{certificate.verification_url}', small_style),
    ]]
    qr_table = Table(qr_data, colWidths=[3 * inch, 1.4 * inch, 3 * inch])
    qr_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(qr_table)

    # Footer rule
    elements.append(Spacer(1, 0.15 * inch))
    elements.append(hr_table)
    elements.append(Paragraph('www.internx.com · education@internx.com', small_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()


def create_and_save_certificate(certificate):
    """
    Generate PDF + QR and attach to Certificate model instance.
    Saves files to media storage.
    """
    # Generate QR code image and save to model
    qr_buffer = generate_qr_code(certificate.verification_url)
    qr_filename = f'qr_{certificate.certificate_id}.png'
    certificate.qr_code.save(qr_filename, ContentFile(qr_buffer.read()), save=False)

    # Generate PDF
    pdf_bytes = generate_certificate_pdf(certificate)
    pdf_filename = f'certificate_{certificate.certificate_id}.pdf'
    certificate.pdf_file.save(pdf_filename, ContentFile(pdf_bytes), save=False)

    certificate.save(update_fields=['pdf_file', 'qr_code'])
    return certificate
