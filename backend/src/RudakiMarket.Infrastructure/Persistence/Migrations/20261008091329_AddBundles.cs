using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace RudakiMarket.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBundles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "bundles",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name_tg = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    name_ru = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    name_en = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    name_uz = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    description_tg = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    description_ru = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    description_en = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    description_uz = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    emoji = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bundles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "bundle_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    bundle_id = table.Column<int>(type: "integer", nullable: false),
                    product_id = table.Column<int>(type: "integer", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bundle_items", x => x.id);
                    table.ForeignKey(
                        name: "fk_bundle_items_bundles_bundle_id",
                        column: x => x.bundle_id,
                        principalTable: "bundles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_bundle_items_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_bundle_items_bundle_id_product_id",
                table: "bundle_items",
                columns: new[] { "bundle_id", "product_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_bundle_items_product_id",
                table: "bundle_items",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "ix_bundles_is_active_sort_order",
                table: "bundles",
                columns: new[] { "is_active", "sort_order" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "bundle_items");

            migrationBuilder.DropTable(
                name: "bundles");
        }
    }
}
