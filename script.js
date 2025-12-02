//loading data
d3.dsv(";", "./bank-full.csv").then(data => {
  //data conversions
  data.forEach(d => {
    d.age = Number(d.age);
    d.balance = Number(d.balance);
    d.duration = Number(d.duration)/60;
    d.campaign = Number(d.campaign);
    d.previous = Number(d.previous);
    d.pdays = Number(d.pdays);
    d.color = d.y === "yes" ? "steelblue" : "orange";
  });

  //removes extreme outliers for better visualization
  function removeOutliers(array, key) {
    const sorted = array.map(d => d[key]).sort((a,b) => a - b);
    const q1 = d3.quantile(sorted, 0.01);
    const q99 = d3.quantile(sorted, 0.99);
    return array.filter(d => d[key] >= q1 && d[key] <= q99);
  }
  
  ["age", "balance", "duration", "campaign", "previous", "pdays"].forEach(key => {
    data = removeOutliers(data, key);
  });

  //make a list with unique job types
  const jobs = [...new Set(data.map(d => d.job))];

  const select = d3.select("#jobFilter");
  select.append("option").attr("value", "all").text("All Jobs");
  
  //for each job put an option in the dropdown
  jobs.forEach(j => select.append("option").attr("value", j).text(j));

  //when the uer change the job, filter the data
  select.on("change", () => {
    const value = select.node().value;
    const filtered = value === "all" ? data : data.filter(d => d.job === value);
    d3.select("#parallel").selectAll("*").remove();
    createParallelPlot(filtered);
  });

  createParallelPlot(data);

});


function createParallelPlot(data) {
  const dimensions = ["age", "balance", "duration", "campaign", "previous", "pdays"];
  const width = 1000, height = 450;
  const margin = { top: 50, right: 80, bottom: 30, left: 50 };

  //reshape wide data to make it tidy
  const points = dimensions.flatMap(dimension =>
    data.map((row, index) => ({
      index,
      dimension,
      value: row[dimension]
    }))
  );

  //normalization scales for each dimension
  const scales = new Map(
    //for each dimension create a pair (dimension,scale)
    dimensions.map(dimension => [
      dimension,
      d3.scaleLinear()
        .domain(d3.extent(data, d => d[dimension])) //find min and max value for that column
        .range([height, 0])
    ])
  );

  const x = d3.scalePoint()
    .domain(dimensions)
    .range([0, width])
    .padding(0.4); //more space

  const svg = d3.select("#parallel")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const line = d3.line()
    .x(d => x(d.dimension))
    .y(d => scales.get(d.dimension)(d.value));
  
  //group points for each person (index)
  const grouped = d3.group(points, d => d.index);
  
  // background gray lines to make graph more clean
  svg.append("g")
    .selectAll("path")
    .data(grouped)
    .join("path")
      .attr("fill", "none")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 0.5)
      .attr("stroke-opacity", 0.1)
      .attr("d", ([index, values]) => line(values));

  //foreground (colored lines)
  svg.append("g")
    .selectAll("path")
    .data(grouped)
    .join("path")
      .attr("fill", "none")
      .attr("stroke", ([index]) => data[index].color)
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 0.8)
      .attr("d", ([index, values]) => line(values));
  
  //create axis and labels
  svg.append("g")
    .selectAll("g")
    .data(dimensions)
    .join("g")
      .attr("transform", d => `translate(${x(d)},0)`)
      .each(function(d) {
        d3.select(this).call(d3.axisLeft(scales.get(d)).ticks(8));
      })
    .append("text")
      .attr("y", - 10)
      .attr("x", 0)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .attr("fill", "black")
      .text(d => {
        const labels = {
          age: "Age (years)",
          balance: "Account Balance (€)",
          duration: "Call Duration (min)",
          campaign: "Contacts in Current Campaign",
          previous: "Previous Contacts",
          pdays: "Days Since Last Contact"
        };
        return labels[d] || d;
      });

  
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 40}, 40)`);

  legend.append("circle").attr("cx", 0).attr("cy", 0).attr("r", 6).style("fill", "steelblue");
  legend.append("text").attr("x", 12).attr("y", 4).text("Subscribed").style("font-size", "11px");

  legend.append("circle").attr("cx", 0).attr("cy", 20).attr("r", 6).style("fill", "orange");
  legend.append("text").attr("x", 12).attr("y", 24).text("Not subscribed").style("font-size", "11px");
}

