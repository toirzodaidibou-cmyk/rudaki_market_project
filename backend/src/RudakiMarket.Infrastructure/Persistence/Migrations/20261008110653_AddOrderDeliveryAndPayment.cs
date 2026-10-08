using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RudakiMarket.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderDeliveryAndPayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "delivery_from",
                table: "orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "delivery_to",
                table: "orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "payment_method",
                table: "orders",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "delivery_from",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "delivery_to",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "payment_method",
                table: "orders");
        }
    }
}
