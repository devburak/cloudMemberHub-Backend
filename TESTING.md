# CloudMemberHub Backend - Test Guide

Bu doküman "Membership Management as a Service" platformunun test edilmesi için hazırlanmıştır. Her kurum (dernek, meslek odası, NGO, siyasi parti) kendi izole edilmiş üyelik sistemi için test senaryoları içerir.

## 🚀 Quick Start

### 1. Server'ı Başlatın
```bash
npm run dev
```

### 2. API Durumunu Kontrol Edin
```bash
curl http://localhost:5000/api
```

## 🏢 Organization-Specific Test Endpoints

### Test Organizasyonları

Sistem şu test organizasyonlarını destekler:

#### 1. MemberHub Development (`memberhub-dev`)
- **Tür**: Dernek (association)
- **Domain**: memberhub.com
- **Subdomain**: dev
- **Modüller**: Tüm modüller aktif
- **Plan**: Enterprise (unlimited)

#### 2. Örnek Derneği (`dernek-ornek`) 
- **Tür**: Dernek (association)
- **Subdomain**: ornekdernek
- **Modüller**: Core, Communication, Events
- **Plan**: Standard

#### 3. Örnek Meslek Odası (`meslek-odasi`)
- **Tür**: Meslek Odası (professional_chamber)  
- **Subdomain**: meslekodasi
- **Modüller**: Core, Financial, Governance, Education
- **Plan**: Premium

### Organization Bilgilerini Kontrol Et

#### Header-based (Default)
```bash
# Ana development organizasyonu
curl -H "X-Organization-ID: memberhub-dev" http://localhost:5000/api/test/organization-info

# Dernek örneği
curl -H "X-Organization-ID: dernek-ornek" http://localhost:5000/api/test/organization-info

# Meslek odası örneği  
curl -H "X-Organization-ID: meslek-odasi" http://localhost:5000/api/test/organization-info
```

#### Legacy Support (eski tenant header'ları)
```bash
curl -H "X-Tenant-ID: memberhub-dev" http://localhost:5000/api/test/organization-info
```

## 👥 Sample Data Oluşturma

### Sample Users Oluştur
```bash
curl -X POST \
  -H "X-Tenant-ID: main" \
  -H "Content-Type: application/json" \
  http://localhost:5000/api/test/create-sample-users
```

Oluşturulan kullanıcılar:
- **Admin**: admin@memberhub.com / Admin123!
- **Manager**: manager@memberhub.com / Manager123!
- **User**: user@memberhub.com / User123!

### Sample Members Oluştur
```bash
curl -X POST \
  -H "X-Tenant-ID: main" \
  -H "Content-Type: application/json" \
  http://localhost:5000/api/test/create-sample-members
```

Oluşturulan üyeler:
- **Ahmet Yılmaz**: Premium üye, Istanbul
- **Ayşe Demir**: Regular üye, Ankara

## 📊 İstatistikleri Görüntüle

### Tenant İstatistikleri
```bash
curl -H "X-Tenant-ID: main" http://localhost:5000/api/test/tenant-stats
```

### Tüm Tenant'ları Listele
```bash
curl http://localhost:5000/api/test/all-tenants
```

## 🔍 Debug ve Test

### Debug Endpoint
```bash
curl -H "X-Tenant-ID: main" http://localhost:5000/api/test/debug
```

Bu endpoint şunları döndürür:
- Request headers
- Tenant context bilgisi
- Middleware chain durumu

### Health Check
```bash
curl http://localhost:5000/health
```

## 🧪 Test Scenarios

### Scenario 1: Tenant Yoksa Hata
```bash
# Tenant header'ı olmadan istek
curl http://localhost:5000/api/test/tenant-info

# Beklenen sonuç: 400 - Tenant ID is required
```

### Scenario 2: Geçersiz Tenant
```bash
# Olmayan tenant ile istek
curl -H "X-Tenant-ID: nonexistent" http://localhost:5000/api/test/tenant-info

# Beklenen sonuç: 404 - Tenant not found
```

### Scenario 3: Multi-Tenant Data Isolation
```bash
# Farklı tenant'larda aynı işlemleri yapın
curl -X POST -H "X-Tenant-ID: tenant1" http://localhost:5000/api/test/create-sample-users
curl -X POST -H "X-Tenant-ID: tenant2" http://localhost:5000/api/test/create-sample-users

# Her tenant'ın kendi verilerini görmeli
curl -H "X-Tenant-ID: tenant1" http://localhost:5000/api/test/tenant-stats
curl -H "X-Tenant-ID: tenant2" http://localhost:5000/api/test/tenant-stats
```

## 🔧 Advanced Testing

### Rate Limiting Test
```bash
# Hızlı çoklu istek gönder
for i in {1..110}; do
  curl -H "X-Tenant-ID: main" http://localhost:5000/api/test/tenant-info
done

# 100'den sonra rate limit hatası beklenir
```

### Database Isolation Test
```bash
# MongoDB'ye bağlan ve database'leri kontrol et
mongosh

# Tenant-specific database'leri listele
show dbs

# Ana tenant database'ini kontrol et  
use cloudmemberhub_main
show collections
db.users.find()
db.members.find()
```

## 📝 Test Checklist

- [ ] Server başarıyla çalışıyor
- [ ] Ana tenant oluşturuldu
- [ ] Tenant context middleware çalışıyor
- [ ] Sample users oluşturuldu
- [ ] Sample members oluşturuldu
- [ ] İstatistikler doğru görüntüleniyor
- [ ] Rate limiting çalışıyor
- [ ] Error handling doğru
- [ ] Database isolation çalışıyor

## 🐛 Troubleshooting

### Common Issues

**1. MongoDB Connection Error**
```bash
# MongoDB'nin çalıştığını kontrol edin
mongosh mongodb://localhost:27017
```

**2. Tenant Not Found**
```bash
# Mock tenant'ları kontrol edin
curl http://localhost:5000/api/test/all-tenants
```

**3. Permission Errors**
```bash
# Tenant'ın feature'larını kontrol edin
curl -H "X-Tenant-ID: main" http://localhost:5000/api/test/tenant-info
```

### Logs
```bash
# Development logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log
```

## 🔄 Reset Data

Tüm test verilerini sıfırlamak için:

```bash
# MongoDB'den tüm collection'ları temizle
mongosh
use cloudmemberhub_main
db.users.deleteMany({})
db.members.deleteMany({})
db.tenants.deleteMany({})

# Ana tenant'ı yeniden oluştur
curl -X POST http://localhost:5000/api/test/setup-main-tenant
```