import fs from 'fs';
import path from 'path';
import { number } from '@inquirer/prompts'; // https://nodejs.org/en/learn/command-line/accept-input-from-the-command-line-in-nodejs

const file = path.join(__dirname, 'helpful-reviews.jsonl');

export interface Review {
  asin: string;
  sentence: string;
  helpful: number;
  main_image_url: string;
  product_title: string;
}
export interface Product {
  asin: string;
  helpful: number;
  title: string;
  review: Review[];
}
export interface ProductCatalog {
  [key: string]: Product;
}

let productCatalog: ProductCatalog = {};

const parseJSONLFile = async (): Promise<ProductCatalog> => {
  return new Promise((resolve, reject) => {
    const data = fs.readFileSync(file, { encoding: 'utf8' });

    const dataStringToArray = data.split('\n');
    const jsonDataArray = dataStringToArray.map((dataString) => {
      try {
        const review = JSON.parse(dataString);
        if (productCatalog[review.asin]) {
          productCatalog[review.asin].review.push(review);
        } else {
          const newProduct: Product = {
            asin: review.asin,
            helpful: 0,
            title: review.product_title,
            review: [review],
          };
          productCatalog[review.asin] = newProduct;
        }
      } catch (error) {
        console.log(`Error Parsing JSON: "${dataString}" \n ERROR: ${error}`);
        reject(error);
      }
    });
    for (const productKey in productCatalog) {
      const product = productCatalog[productKey];
      const reviewCount = product.review.length;
      const helpful =
        product.review.reduce((acc, review) => {
          return acc + review.helpful;
        }, 0) / reviewCount;
      productCatalog[productKey].helpful = Math.round(helpful * 100) / 100;
    }
    console.log('Reviews Loaded');
    return resolve(productCatalog);
  });
};

const searchForReviewsByCount = async (): Promise<void> => {
  if (!Object.values(productCatalog).length) {
    console.log('Loading Reviews');
    productCatalog = await parseJSONLFile();
  }
  const numberArg: undefined | number = process.argv[2]
    ? parseInt(process.argv[2])
    : undefined;
  const answer = Number.isFinite(numberArg)
    ? numberArg
    : await number({
        message:
          'The Product you are searching for has how many reviews? (type 0 to exit)',
      });
  try {
    console.log(
      `answer: ${answer} numberArg: ${numberArg} && ${typeof answer} && length: ${
        Object.values(productCatalog).length
      }`
    );
    if (answer === 0) {
      console.log('Exiting');
      process.exit(0);
    } else if (answer === 1) {
      await sortByScoreAndReviewCount();
    }
    if (!Number.isFinite(answer)) {
      console.log('Please enter a valid number');
      await searchForReviewsByCount();
      return;
    }
    const products = Object.values(productCatalog).filter(
      (product) => product.review.length === answer
    );

    products.forEach((product) => {
      console.log(product);
    });
    if (numberArg) {
      process.exit(0);
    }
    await searchForReviewsByCount();
  } catch (error) {
    console.log(`Error While searching for ${answer} review count:`, error);
  }
};

const sortByScoreAndReviewCount = async (): Promise<void> => {
  productCatalog = await parseJSONLFile();
  const productCatalogArray = Object.values(productCatalog);
  const sortedProductCatalogArray = productCatalogArray.sort((a, b) => {
    if (a.helpful === b.helpful) {
      return b.review.length - a.review.length;
    }
    return b.helpful - a.helpful;
  });
  const productTable = sortedProductCatalogArray.map((product) => {
    return {
      asin: product.asin,
      title: product.title.slice(0, 50),
      helpful: product.helpful,
      reviewCount: product.review.length,
    };
  });
  console.table(productTable);
};

searchForReviewsByCount();
