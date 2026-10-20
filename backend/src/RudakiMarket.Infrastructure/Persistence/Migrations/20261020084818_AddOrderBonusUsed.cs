using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RudakiMarket.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderBonusUsed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "bonus_used",
                table: "orders",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "bonus_used",
                table: "orders");
        }
    }
}
