export const brandIcons = {
  menu: "/brand/additional-icons/navigation/menu.svg",
  close: "/brand/additional-icons/filters/x.svg",
  search: "/brand/additional-icons/navigation/search.svg",
  cart: "/brand/additional-icons/navigation/shopping-cart.svg",
  user: "/brand/additional-icons/navigation/user.svg",
  chevronDown: "/brand/additional-icons/navigation/arrow-down.svg",
  whatsapp: "/brand/additional-icons/contact/whatsapp.svg",
  instagram: "/brand/additional-icons/contact/instagram.svg",
  facebook: "/brand/additional-icons/contact/facebook.svg",
  email: "/brand/additional-icons/contact/mail.svg",
  share: "/brand/additional-icons/commerce/share.svg",
  package: "/brand/additional-icons/commerce/package.svg",
  truck: "/brand/additional-icons/commerce/truck.svg"
} as const;

export type BrandIconName = keyof typeof brandIcons;
