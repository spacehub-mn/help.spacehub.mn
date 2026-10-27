---
type: zaavar
roles: [owner, menejer]
updated: 2026-10-27
verified_commit: 5fa824f
---

# Бүртгэлтэй дугаар солих

<!-- Кодын тулгалт spacehub 03de3014 (Help_Spacehub 10-27):
- доод цэс «Бүртгэл» = pages.landlord.account mn_MN.json:448; LessorPage.dart:120-124
- «Хувийн мэдээлэл» = pages.rentor.account.userProfile mn_MN.json:791; UserScreen.dart:175-180 → UserProfilePage (UserProfileScreen.dart:68 гарчиг «Засварлах» general.edit :169)
- «Утас» мөр = pages.userProfile.phone mn_MN.json:887; UserProfileScreen.dart:115-120 (FieldEditListTile → FieldEditScreen)
- «Хадгалах» = general.save mn_MN.json:209; FieldEditScreen.dart:197
- амжилт «Амжилттай!» = pages.rentor.account.edit.success mn_MN.json:779; UserProfileScreen.dart:216-223
- баталгаажаагүй үед «Баталгаажуулах» = pages.userProfile.verifyHandle mn_MN.json:891; UserProfileScreen.dart:125-131 → VerifyPage
- «Байгууллагын мэдээлэл» = pages.customerProfile.title#company mn_MN.json:406 (айл өрхөд «Өрхийн мэдээлэл» :407); UserScreen.dart:181-186; утас CustomerProfileScreen.dart:306; өндөр эрхгүй бол зөвхөн унших UserScreen.dart:97-98
-->

> 🏢 Эзэмшигч, менежер · Гар утасны апп

:::caution 2023 оны заавар
Спейсхаб аппын (ҮХХ эзэмшигч) 2023 оны хувилбарын заавар. Дэлгэц өөрчлөгдсөн байж болно — зураг/видеог шинэчилж байна.
:::

## Энэ юу вэ
Таны нэвтрэх бүртгэлд холбосон утасны дугаарыг аппаас солих заавар.

## Хэзээ хэрэглэх
- Утасны дугаараа сольсон үед.
- Бүртгэлд буруу дугаар орсон үед.

## Алхам
1. Доод цэсний **Бүртгэл** хэсгийг сонго.
2. **Хувийн мэдээлэл** мөрийг дар.
3. **Утас** мөрийг дар.
4. Шинэ дугаараа оруул.
5. **Хадгалах** товч дар. «Амжилттай!» гэж гарна.
6. Дугаар баталгаажаагүй бол **Утас** мөрөөс **Баталгаажуулах** товч дарж баталгаажуул.

## ⚠️ Анхаар
- Энэ нь зөвхөн таны хувийн бүртгэлийн дугаарыг солино.
- Байгууллагын утсыг **Байгууллагын мэдээлэл** хэсгээс засна. Үүнийг зөвхөн удирдах албан тушаалтай хэрэглэгч засах боломжтой.

## 🔗 Холбоотой
- [Блоклосон хэрэглэгч гаргах](/lessor/account/unblock-user)
- [Апп ажиллахгүй үед](/app-ajillahgui)
