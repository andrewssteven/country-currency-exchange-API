module.exports = (sequelize, DataTypes) => {
  const Country = sequelize.define(
    "Country",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      capital: { type: DataTypes.STRING, allowNull: true },
      region: { type: DataTypes.STRING, allowNull: true },
      population: { type: DataTypes.BIGINT, allowNull: false },
      currency_code: { type: DataTypes.STRING, allowNull: true },
      exchange_rate: { type: DataTypes.FLOAT, allowNull: true },
      estimated_gdp: { type: DataTypes.DOUBLE, allowNull: true },
      flag_url: { type: DataTypes.STRING, allowNull: true },
      last_refreshed_at: { type: DataTypes.DATE, allowNull: true },
    },
    { timestamps: true }
  );

  return Country;
};
