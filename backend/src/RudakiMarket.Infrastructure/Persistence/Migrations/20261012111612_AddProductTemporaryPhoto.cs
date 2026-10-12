using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RudakiMarket.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductTemporaryPhoto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "temporary_photo",
                table: "products",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Суратҳои аз манбаи бегона: молҳои воридшуда аз alifshop.tj (2026-10-07, №33: id 25–1282)
            // ва RC Cola #17, #22 (суратҳо аз Kaspi.kz ва OKOLO Market, №31). Танҳо онҳое, ки сурат доранд.
            migrationBuilder.Sql("""
                UPDATE products SET temporary_photo = true
                WHERE (id BETWEEN 25 AND 1282 OR id IN (17, 22))
                  AND EXISTS (SELECT 1 FROM product_images i WHERE i.product_id = products.id);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "temporary_photo",
                table: "products");
        }
    }
}
