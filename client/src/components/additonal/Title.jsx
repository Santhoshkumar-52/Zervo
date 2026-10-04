const Title = ({ title, description }) => {
  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>

      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
};

export default Title;
