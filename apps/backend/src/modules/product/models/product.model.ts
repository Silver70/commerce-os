import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class ProductOptionValue {
  @Field(() => ID)
  declare id: string;

  @Field()
  declare value: string;

  @Field(() => Int)
  declare position: number;
}

@ObjectType()
export class ProductOption {
  @Field(() => ID)
  declare id: string;

  @Field()
  declare name: string;

  @Field(() => Int)
  declare position: number;

  @Field(() => [ProductOptionValue])
  declare values: ProductOptionValue[];
}

@ObjectType()
export class ProductMediaItem {
  @Field(() => ID)
  declare id: string;

  @Field()
  declare url: string;

  @Field({ nullable: true })
  declare altText?: string;

  @Field()
  declare mediaType: string;

  @Field(() => Int)
  declare position: number;

  @Field()
  declare isPrimary: boolean;
}

@ObjectType()
export class ProductVariantType {
  @Field(() => ID)
  declare id: string;

  @Field()
  declare sku: string;

  @Field({ nullable: true })
  declare name?: string;

  @Field(() => Int, { description: 'Price in cents' })
  declare price: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Compare-at price in cents',
  })
  declare compareAtPrice?: number;

  @Field(() => Int, { nullable: true })
  declare weight?: number;

  @Field({ nullable: true })
  declare weightUnit?: string;

  @Field()
  declare requiresShipping: boolean;

  @Field()
  declare isActive: boolean;

  @Field(() => Int)
  declare position: number;

  @Field(() => [ProductOptionValue])
  declare optionValues: ProductOptionValue[];

  @Field()
  declare createdAt: Date;

  @Field()
  declare updatedAt: Date;
}

@ObjectType()
export class ProductType {
  @Field(() => ID)
  declare id: string;

  @Field()
  declare name: string;

  @Field()
  declare slug: string;

  @Field({ nullable: true })
  declare description?: string;

  @Field()
  declare status: string;

  @Field({ nullable: true })
  declare vendor?: string;

  @Field(() => [String], { nullable: true })
  declare tags?: string[];

  @Field({ nullable: true })
  declare seoTitle?: string;

  @Field({ nullable: true })
  declare seoDescription?: string;

  @Field(() => [ProductVariantType])
  declare variants: ProductVariantType[];

  @Field(() => [ProductOption])
  declare options: ProductOption[];

  @Field(() => [ProductMediaItem])
  declare media: ProductMediaItem[];

  @Field(() => [String])
  declare categoryIds: string[];

  @Field(() => Int, { description: 'Lowest variant price in cents' })
  declare minPrice: number;

  @Field(() => Int, { description: 'Highest variant price in cents' })
  declare maxPrice: number;

  @Field()
  declare createdAt: Date;

  @Field()
  declare updatedAt: Date;
}

@ObjectType()
export class ProductEdge {
  @Field(() => ProductType)
  declare node: ProductType;

  @Field()
  declare cursor: string;
}

@ObjectType()
export class PageInfo {
  @Field({ nullable: true })
  declare endCursor?: string;

  @Field()
  declare hasNextPage: boolean;
}

@ObjectType()
export class ProductConnection {
  @Field(() => [ProductEdge])
  declare edges: ProductEdge[];

  @Field(() => PageInfo)
  declare pageInfo: PageInfo;

  @Field(() => Int)
  declare totalCount: number;
}

@ObjectType()
export class CategoryType {
  @Field(() => ID)
  declare id: string;

  @Field()
  declare name: string;

  @Field()
  declare slug: string;

  @Field({ nullable: true })
  declare description?: string;

  @Field({ nullable: true })
  declare parentId?: string;

  @Field(() => Int)
  declare position: number;

  @Field(() => [CategoryType])
  declare children: CategoryType[];

  @Field()
  declare createdAt: Date;

  @Field()
  declare updatedAt: Date;
}
