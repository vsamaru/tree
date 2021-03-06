import * as d3 from "d3";
import "./styles.css";

var margin = { top: 0, right: 120, bottom: 0, left: 120 },
  width = 720,
  step = 100;

function tree(leftRoot, rightRoot, outerHeight) {
  if (arguments.length < 3) {
    outerHeight = rightRoot;
    rightRoot = null;
  }

  var height = outerHeight - margin.top - margin.bottom;

  var tree = d3.layout
    .tree()
    .size([height, 1])
    .separation(function() {
      return 1;
    });

  var svg = d3
    .select("body")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("margin-top", "58px");

  var g = svg
    .selectAll("g")
    .data(
      [].concat(
        leftRoot ? { type: "left", nodes: tree.nodes(leftRoot) } : [],
        rightRoot
          ? {
              type: "right",
              nodes: tree.nodes(rightRoot).map(flip),
              flipped: true
            }
          : []
      )
    )
    .enter()
    .append("g")
    .attr("class", function(d) {
      return d.type;
    })
    .attr("transform", function(d) {
      return (
        "translate(" +
        (!!d.flipped * width + margin.left) +
        "," +
        margin.top +
        ")"
      );
    });

  var node = g
    .append("g")
    .attr("class", "node")
    .selectAll("g")
    .data(function(d) {
      return d.nodes;
    })
    .enter()
    .append("g")
    .attr("class", function(d) {
      return d.type;
    })
    .attr("transform", function(d) {
      return "translate(" + d.depth * step + "," + d.x + ")";
    });

  node
    .append("text")
    .attr("x", function(d) {
      return d.flipped ? -6 : 6;
    })
    .attr("dy", ".35em")
    .text(function(d) {
      return d.name;
    })
    .each(function(d) {
      d.width = Math.max(32, this.getComputedTextLength() + 12);
    });

  node
    .filter(function(d) {
      return "join" in d;
    })
    .insert("path", "text")
    .attr("class", "join")
    .attr(
      "d",
      d3.svg
        .diagonal()
        .source(function(d) {
          return { y: d.width, x: 0 };
        })
        .target(function(d) {
          return { y: 88, x: d.join * 24 };
        })
        .projection(function(d) {
          return [d.y, d.x];
        })
    );

  node
    .insert("rect", "text")
    .attr("ry", 6)
    .attr("rx", 6)
    .attr("y", -10)
    .attr("height", 20)
    .attr("width", function(d) {
      return d.width;
    })
    .filter(function(d) {
      return d.flipped;
    })
    .attr("x", function(d) {
      return -d.width;
    });

  var link = g
    .insert("g", ".node")
    .attr("class", "link")
    .selectAll("path")
    .data(function(d) {
      return tree.links(d.nodes);
    })
    .enter()
    .append("path")
    .attr("class", function(d) {
      return "to-" + d.target.type + " from-" + d.source.type;
    })
    .attr(
      "d",
      d3.svg
        .diagonal()
        .source(function(d) {
          return {
            y:
              d.source.depth * step +
              (d.source.flipped ? -1 : +1) * d.source.width,
            x: d.source.x
          };
        })
        .target(function(d) {
          return { y: d.target.depth * step, x: d.target.x };
        })
        .projection(function(d) {
          return [d.y, d.x];
        })
    );

  function flip(d) {
    d.depth *= -1;
    d.flipped = true;
    return d;
  }

  return svg;
}

function treeAnimation(startRoot, startHeight, endRoot, endHeight) {
  var end = tree(endRoot, endHeight).remove(),
    height = +end.attr("height"),
    start = tree(startRoot, startHeight).attr("height", height),
    svg = start.node(),
    offset = (endHeight - startHeight) / 2,
    transform = "translate(" + margin.left + "," + offset + ")";

  var play = start.append("g").attr("class", "play");

  play
    .append("circle")
    .attr("r", 45)
    .attr(
      "transform",
      "translate(" + (margin.left + width / 2) + "," + height / 2 + ")"
    );

  play
    .append("path")
    .attr("d", "M-22,-30l60,30l-60,30z")
    .attr(
      "transform",
      "translate(" + (margin.left + width / 2) + "," + height / 2 + ")scale(.7)"
    );

  play
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .on("click", function() {
      resetAll();
      transition1();
    });

  end = d3.select(svg.appendChild(end.node().firstChild));
  start = d3.select(svg.firstChild).attr("transform", transform);
  end.selectAll(".array").each(function() {
    this.parentNode.appendChild(this);
  }); // mask elements

  var startNodes = start.datum().nodes,
    startElements = startNodes.filter(function(d) {
      return d.type === "element";
    }),
    endNodes = end.datum().nodes,
    endGroups = endNodes.filter(function(d) {
      return d.type === "array";
    });

  resetAll();

  function resetAll() {
    start.call(reset).style("display", null);
    end.call(reset).style("display", "none");
    play.style("display", null);
  }

  function reset(svg) {
    svg
      .selectAll(".node g,.link")
      .style("stroke-opacity", null)
      .style("fill-opacity", null);

    start
      .selectAll(".array")
      .attr("class", function(d) {
        return d.type;
      })
      .attr("transform", function(d, i) {
        return "translate(" + d.depth * step + "," + d.x + ")";
      })
      .select("rect")
      .attr("width", function(d) {
        return d.width;
      });
  }

  function transition1() {
    play.style("display", "none");

    var t = start
      .transition()
      .duration(1000 + (startElements.length - 1) * 50)
      .each("end", transition2);

    t.selectAll(".selection,.array,.link")
      .duration(0)
      .style("stroke-opacity", 0)
      .style("fill-opacity", 0);

    t.selectAll(".element")
      .duration(500)
      .delay(function(d, i) {
        return 500 + i * 50;
      })
      .attr("transform", function(d, i) {
        return (
          "translate(" +
          (d.depth - 1) * step +
          "," +
          (endGroups[i].x - offset) +
          ")"
        );
      })
      .attr("class", "array")
      .select("rect")
      .attr("width", function(d, i) {
        return endGroups[i].width;
      });
  }

  function transition2() {
    end
      .style("display", null)
      .selectAll(".element,.to-element")
      .style("display", "none");

    end
      .selectAll(".selection,.to-array,.array")
      .style("stroke-opacity", 0)
      .style("fill-opacity", 0)
      .transition()
      .duration(0)
      .style("stroke-opacity", 1)
      .style("fill-opacity", 1);

    end
      .transition()
      .duration(500)
      .each("end", transition3);
  }

  function transition3() {
    start.style("display", "none");

    end
      .selectAll(".element")
      .style("display", null)
      .attr("transform", function(d) {
        return "translate(" + d.parent.depth * step + "," + d.parent.x + ")";
      })
      .transition()
      .duration(500)
      .delay(function(d, i) {
        return i * 50;
      })
      .attr("transform", function(d) {
        return "translate(" + d.depth * step + "," + d.x + ")";
      });

    end
      .selectAll(".to-element")
      .style("display", null)
      .attr(
        "d",
        d3.svg
          .diagonal()
          .source(function(d) {
            return { y: d.source.depth * step + d.source.width, x: d.source.x };
          })
          .target(function(d, i) {
            return { y: d.source.depth * step + d.source.width, x: d.source.x };
          })
          .projection(function(d) {
            return [d.y, d.x];
          })
      )
      .transition()
      .duration(500)
      .delay(function(d, i) {
        return i * 50;
      })
      .attr(
        "d",
        d3.svg
          .diagonal()
          .source(function(d) {
            return { y: d.source.depth * step + d.source.width, x: d.source.x };
          })
          .target(function(d, i) {
            return { y: d.target.depth * step, x: d.target.x };
          })
          .projection(function(d) {
            return [d.y, d.x];
          })
      );

    end
      .transition()
      .duration(5000)
      .each("end", resetAll);
  }
}

treeAnimation(
  {
    type: "selection",
    name: "selection",
    children: [
      {
        type: "array",
        name: "group₀",
        children: [
          { type: "element", name: "tr₀" },
          { type: "element", name: "tr₁" },
          { type: "element", name: "tr₂" },
          { type: "element", name: "tr₃" }
        ]
      }
    ]
  },
  24 * 4,
  {
    type: "selection",
    name: "selection",
    children: [
      {
        type: "array",
        name: "group₀",
        children: [
          { type: "element", name: "td₀" },
          { type: "element", name: "td₁" },
          { type: "element", name: "td₂" },
          { type: "element", name: "td₃" }
        ]
      },
      {
        type: "array",
        name: "group₁",
        children: [
          { type: "element", name: "td₄" },
          { type: "element", name: "XXXXXXXXXX" },
          { type: "element", name: "td₆" },
          { type: "element", name: "td₇" }
        ]
      },
      {
        type: "array",
        name: "group₂",
        children: [
          { type: "element", name: "td₈" },
          { type: "element", name: "td₉" },
          { type: "element", name: "td₁₀" },
          { type: "element", name: "td₁₁" }
        ]
      },
      {
        type: "array",
        name: "group₃",
        children: [
          { type: "element", name: "td₁₂" },
          { type: "element", name: "td₁₃" },
          { type: "element", name: "td₁₄" },
          { type: "element", name: "td₁₅" }
        ]
      }
    ]
  },
  24 * 16
);
