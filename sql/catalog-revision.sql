insert into public.services_products (
  id, item_type, name, category, type, description, price, duration,
  stock, min_stock, active, image
) values
  (
    'svc-car', 'SERVICE', 'Regular Car Wash', 'REGULAR', 'CAR',
    'Cuci tangan menyeluruh dengan busa, bilas bertekanan, dan pengeringan rapi.',
    80000, 50, 0, 0, true,
    'https://images.pexels.com/photos/6873176/pexels-photo-6873176.jpeg?auto=compress&cs=tinysrgb&w=1000'
  ),
  (
    'svc-moto', 'SERVICE', 'Regular Motorcycle Wash', 'REGULAR', 'MOTOR',
    'Pembersihan bodi, roda, dan sela mesin agar motor siap digunakan kembali.',
    35000, 35, 0, 0, true,
    'https://images.pexels.com/photos/36709685/pexels-photo-36709685.jpeg?auto=compress&cs=tinysrgb&w=1000'
  ),
  (
    'svc-self-car', 'SERVICE', 'Self-Service Car', 'SELF_SERVICE', 'CAR',
    'Cuci mobil sendiri di bay khusus dengan foam dan semprotan bertekanan.',
    30000, 30, 0, 0, true,
    'https://images.pexels.com/photos/15363884/pexels-photo-15363884.jpeg?auto=compress&cs=tinysrgb&w=1000'
  ),
  (
    'svc-self-moto', 'SERVICE', 'Self-Service Motorcycle', 'SELF_SERVICE', 'MOTOR',
    'Cuci motor sendiri di bay khusus dengan peralatan yang siap digunakan.',
    20000, 25, 0, 0, true,
    'https://images.pexels.com/photos/20515049/pexels-photo-20515049.jpeg?auto=compress&cs=tinysrgb&w=1000'
  ),
  (
    'addon-vacuum', 'ADD_ON', 'Interior Vacuum', 'ADD_ON', null,
    'Pembersihan debu dan kotoran dari karpet serta kabin kendaraan.',
    20000, 15, 0, 0, true,
    'https://images.pexels.com/photos/5233285/pexels-photo-5233285.jpeg?auto=compress&cs=tinysrgb&w=700'
  ),
  (
    'addon-wax', 'ADD_ON', 'Spray Wax', 'ADD_ON', null,
    'Lapisan kilap tambahan untuk membantu menjaga hasil cuci.',
    25000, 10, 0, 0, true,
    'https://images.pexels.com/photos/20042050/pexels-photo-20042050.jpeg?auto=compress&cs=tinysrgb&w=700'
  ),
  (
    'addon-tire', 'ADD_ON', 'Tire Dressing', 'ADD_ON', null,
    'Finishing satin untuk tampilan ban yang bersih.',
    15000, 8, 0, 0, true,
    'https://images.pexels.com/photos/7154623/pexels-photo-7154623.jpeg?auto=compress&cs=tinysrgb&w=700'
  ),
  (
    'prd-shampoo', 'PRODUCT', 'Sampo Cuci Mobil pH Netral', 'CUCI & PERAWATAN', null,
    'Sampo kendaraan pH netral untuk perawatan rutin tanpa mengganggu lapisan wax · 500 ml.',
    45000, 0, 24, 6, true,
    'https://images.pexels.com/photos/9470891/pexels-photo-9470891.jpeg?auto=compress&cs=tinysrgb&w=700'
  ),
  (
    'prd-cloth', 'PRODUCT', 'Kain Microfiber Premium', 'PERLENGKAPAN', null,
    'Kain microfiber lembut dengan daya serap tinggi · 40 × 40 cm.',
    45000, 0, 14, 5, true,
    'https://images.pexels.com/photos/39562202/pexels-photo-39562202.jpeg?auto=compress&cs=tinysrgb&w=700'
  ),
  (
    'prd-tire', 'PRODUCT', 'Semir Ban Satin', 'PERLINDUNGAN', null,
    'Perawatan ban dengan hasil hitam satin dan tampilan rapi · 250 ml.',
    60000, 0, 9, 4, true,
    'https://images.pexels.com/photos/12920558/pexels-photo-12920558.jpeg?auto=compress&cs=tinysrgb&w=700'
  ),
  (
    'prd-wax', 'PRODUCT', 'Wax Cair Kilap Dalam', 'PERLINDUNGAN', null,
    'Wax cair untuk menambah kilap dan membantu melindungi permukaan cat · 250 ml.',
    125000, 0, 3, 5, true,
    'https://images.pexels.com/photos/7796591/pexels-photo-7796591.jpeg?auto=compress&cs=tinysrgb&w=700'
  ),
  (
    'prd-interior', 'PRODUCT', 'Pembersih Interior', 'PERAWATAN INTERIOR', null,
    'Pembersih untuk jok dan trim interior kendaraan · 300 ml.',
    50000, 0, 11, 4, true,
    'https://images.pexels.com/photos/10566526/pexels-photo-10566526.jpeg?auto=compress&cs=tinysrgb&w=700'
  ),
  (
    'prd-glass', 'PRODUCT', 'Pembersih Kaca Otomotif', 'PERAWATAN KACA', null,
    'Pembersih kaca kendaraan untuk hasil bening tanpa bekas lap · 300 ml.',
    40000, 0, 10, 4, true,
    'https://images.pexels.com/photos/11215808/pexels-photo-11215808.jpeg?auto=compress&cs=tinysrgb&w=700'
  )
on conflict (id) do update set
  item_type = excluded.item_type,
  name = excluded.name,
  category = excluded.category,
  type = excluded.type,
  description = excluded.description,
  price = excluded.price,
  duration = excluded.duration,
  active = excluded.active,
  image = excluded.image,
  updated_at = now();
