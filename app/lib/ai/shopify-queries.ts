// GraphQL query and mutation strings for Shopify Admin API

export const GET_PRODUCTS = `#graphql
  query GetProducts($query: String, $first: Int!) {
    products(query: $query, first: $first) {
      edges {
        node {
          id
          title
          handle
          status
          productType
          vendor
          totalInventory
          descriptionHtml
          priceRangeV2 {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          featuredMedia {
            preview { image { url altText } }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                sku
                price
                inventoryQuantity
                inventoryItem {
                  unitCost { amount currencyCode }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_ORDERS = `#graphql
  query GetOrders($query: String, $first: Int!) {
    orders(query: $query, first: $first, sortKey: PROCESSED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          processedAt
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          subtotalPriceSet { shopMoney { amount currencyCode } }
          customer { id displayName email }
          lineItems(first: 10) {
            edges {
              node {
                name
                quantity
                sku
                originalUnitPriceSet { shopMoney { amount } }
              }
            }
          }
          shippingAddress { city provinceCode country }
        }
      }
    }
  }
`;

export const GET_CUSTOMERS = `#graphql
  query GetCustomers($query: String, $first: Int!) {
    customers(query: $query, first: $first) {
      edges {
        node {
          id
          displayName
          email
          phone
          numberOfOrders
          amountSpent { amount currencyCode }
          createdAt
          defaultAddress { city provinceCode country }
          tags
        }
      }
    }
  }
`;

export const GET_INVENTORY_ITEMS = `#graphql
  query GetInventoryItems($first: Int!) {
    productVariants(first: $first) {
      edges {
        node {
          id
          title
          sku
          inventoryQuantity
          product { id title }
          inventoryItem {
            id
            unitCost { amount currencyCode }
            inventoryLevels(first: 5) {
              edges {
                node {
                  id
                  quantities(names: ["available", "incoming", "committed"]) {
                    name
                    quantity
                  }
                  location { id name }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_ORDERS_COUNT = `#graphql
  query GetOrdersCount($query: String) {
    ordersCount(query: $query) {
      count
    }
  }
`;

export const GET_PRODUCTS_COUNT = `#graphql
  query GetProductsCount {
    productsCount {
      count
    }
  }
`;

// --- Mutations ---

export const CREATE_PAGE = `#graphql
  mutation pageCreate($page: PageCreateInput!) {
    pageCreate(page: $page) {
      page { id title handle body }
      userErrors { field message }
    }
  }
`;

export const UPDATE_PAGE = `#graphql
  mutation pageUpdate($id: ID!, $page: PageUpdateInput!) {
    pageUpdate(id: $id, page: $page) {
      page { id isPublished }
      userErrors { field message }
    }
  }
`;

export const CREATE_DISCOUNT_CODE = `#graphql
  mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            codes(first: 1) { nodes { code } }
          }
        }
      }
      userErrors { field message }
    }
  }
`;

export const UPDATE_PRODUCT = `#graphql
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id title descriptionHtml }
      userErrors { field message }
    }
  }
`;
