window.STORE_DATA = Object.freeze({
  business: {
    brand: "Kit Papai Noel Passou Aqui",
    whatsapp: "5513996589014",
    phoneDisplay: "(13) 99658-9014",
    email: "contato@papainoelpassouaqui.com.br"
  },
  pix: {
    enabled: false,
    key: "",
    keyType: "",
    displayName: "",
    receiverName: "",
    city: "SAO PAULO",
    discount: 15
  },
  shipping: {
    mode: "manual",
    flatRate: 0
  },
  products: [
    {
          "id": "basic",
          "name": "Lareira Especial de Natal",
          "price": 53.9,
          "discountIncluded": true,
          "prop": "Uma lareira decorativa de papelão para criar o cenário do Papai Noel em casa, com pegadas, carta e adesivo de janela.",
          "benefits": [
                "Lareira decorativa de papelão (montagem simples; fogo ilustrativo)",
                "13 pegadas adesivas (6 pares + 1 solta), 22 × 8 cm cada",
                "Carta padrão do Papai Noel",
                "Adesivo de janela Papai Noel Passou Aqui"
          ],
          "image": "assets/hero-lareira-familia-natal-2026.avif",
          "active": true
    },
    {
      id: "personal",
      name: "Personalizado",
      price: 69.90,
      prop: "Uma experiência com 21 pegadas e itens personalizados: carta, certificado e placa com o nome da criança.",
      benefits: ["10 pares + 1 pegada solta (21 pegadas)","Adesivo para janela","Placa com nome da criança","Certificado personalizado","Carta personalizada","Guia de aplicação"],
      image: "assets/product/kit-personalizado.webp",
      active: true
    }
  ]
});
