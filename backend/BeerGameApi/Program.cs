using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS for the frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

// ----------------------------------------------------
// MOCKED ENDPOINTS PARA PRUEBAS DE CONEXIÓN FRONTEND
// ----------------------------------------------------

app.MapGet("/api/game/state", () =>
{
    // Retornamos un objeto de prueba simulando el estado inicial del juego
    var state = new
    {
        currentDay = 1,
        currentTurnRole = "retailer",
        turnPhase = "arrivals",
        isGameOver = false,
        winnerRole = (string?)null,
        players = new[]
        {
            new { role = "retailer", stock = 15, money = 1200, backlog = 0, totalHoldingCost = 0, totalStockoutCost = 0 },
            new { role = "wholesaler", stock = 30, money = 2000, backlog = 0, totalHoldingCost = 0, totalStockoutCost = 0 },
            new { role = "factory", stock = 100, money = 5000, backlog = 0, totalHoldingCost = 0, totalStockoutCost = 0 }
        }
    };
    
    return Results.Ok(state);
})
.WithName("GetGameState");

app.Run();
