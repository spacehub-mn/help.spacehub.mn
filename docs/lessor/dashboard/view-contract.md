---
type: zaavar
roles: [owner, menejer]
updated: 2026-10-28
verified_commit: 03de3014
verified_repo: spacehub
---

# Түрээслэгчийн гэрээг QR-аар харах

<!-- Кодын тулгалт spacehub 03de3014 (Help_Spacehub 10-27):
- Зураг: прод api.spacehub.mn, Рентхаб owner, апп 03de3014 эмулятор (Help_Spacehub 10-28); хадгалах/илгээх/OK товч дараагүй, нэр/утас бүдгэрүүлсэн
- QR тэмдэг (Symbols.qr_code_rounded) аппын дээд мөрөнд, бүх доод цэсний хэсэгт: LessorPage.dart:93-95 (SpacehubAppBar actions), QRScanIconButton.dart:11-14 → routes.qrscan
- дэлгэцийн гарчиг «QR код» general.scanQR mn_MN.json:210; QRScanScreen.dart:41; гар чийдэн товч баруун доод QRScanScreen.dart:50-62
- уншсан холбоос contract/ID бол ContractPage нээгдэнэ, утас чичирнэ QRScanScreen.dart:70-84; User.dart:1478-1482
- түрээслэгчийн талд «Миний QR» pages.newTenantDashboard.myQR :601; ActiveContractCard.dart:44-50 → ContractQRDialog (зургийг серверээс /v1/Contract/ID/QRCode татна ContractQRDialog.dart:25-36; доторх холбоос contract/ID гэдэг нь ❔)
- танихгүй холбоос → deeplinkToRoute null → юу ч нээгдэхгүй QRScanScreen.dart:71-77
- хуучин «Dashboard хэсгийг сонгох» алхмыг хассан: QR тэмдэг бүх хэсэгт байна
-->

> 🏢 Эзэмшигч, менежер · Гар утасны апп

## Энэ юу вэ
Түрээслэгчийн утсан дээрх QR кодыг уншуулж, түүний гэрээг шууд нээх заавар.

## Хэзээ хэрэглэх
- Түрээслэгч биечлэн ирэхэд гэрээг нь хурдан олох үед.
- Гэрээний дугаар мэдэхгүй үед.

## Алхам
1. Түрээслэгчээс аппынхаа **Миний QR**-ыг нээхийг хүс.
![Нүүрний баруун дээд QR тэмдэг](/img/lessor/view-contract-1.webp)

*Зураг 1. Нүүрний баруун дээд QR тэмдэг. Улаан дугаар = алхмын дугаар.*

2. Аппын баруун дээд буланд байгаа QR тэмдгийг дар.
![QR код уншуулах дэлгэц](/img/lessor/view-contract-2.webp)

*Зураг 2. QR код уншуулах дэлгэц. Улаан дугаар = алхмын дугаар.*

3. **QR код** дэлгэц нээгдэнэ.
4. Камераа түрээслэгчийн QR код руу чиглүүл.
5. Код уншигдахад утас чичирч, гэрээ нээгдэнэ.

## ⚠️ Анхаар
- Харанхуй газар баруун доод талын гар чийдэнгийн товчийг дар.
- Spacehub-ын бус QR код уншуулбал юу ч нээгдэхгүй.

## 🔗 Холбоотой
- [Гэрээний үндсэн мэдээлэл харах](/lessor/contract/view-contract-details)
- [Төлбөрийн хуваарь харах](/lessor/contract/view-payment-chart)
