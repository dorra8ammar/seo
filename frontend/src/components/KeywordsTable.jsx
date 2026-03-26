import { useEffect, useMemo, useState } from "react";

import { getKeywords } from "../api";

const perPage = 10;

export default function KeywordsTable() {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("clicks");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function fetchKeywords() {
      setLoading(true);
      try {
        const json = await getKeywords(20);
        if (cancelled) return;
        setKeywords(json.data || []);
      } catch {
        if (cancelled) return;
        setKeywords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchKeywords();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    return [...keywords]
      .filter((item) => item.keyword.toLowerCase().includes(searchLower))
      .sort((a, b) => compareValues(a, b, sortBy, sortDir));
  }, [keywords, search, sortBy, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  function handleSort(column) {
    if (sortBy === column) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir("desc");
  }

  if (loading) return <div className="kw-card">Chargement des mots-cles...</div>;

  return (
    <div className="kw-card">
      <div className="kw-header">
        <div>
          <h3>Top Mots-cles</h3>
          <p>{filtered.length} mots-cles trouves</p>
        </div>

        <input
          className="kw-search"
          type="text"
          placeholder="Rechercher un mot-cle..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="kw-table-wrap">
        <table className="kw-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Mot-cle</th>
              <th className="sortable" onClick={() => handleSort("position")}>
                Position <SortIcon active={sortBy === "position"} dir={sortDir} />
              </th>
              <th className="sortable" onClick={() => handleSort("clicks")}>
                Clics <SortIcon active={sortBy === "clicks"} dir={sortDir} />
              </th>
              <th className="sortable" onClick={() => handleSort("impressions")}>
                Impressions <SortIcon active={sortBy === "impressions"} dir={sortDir} />
              </th>
              <th className="sortable" onClick={() => handleSort("ctr")}>
                CTR <SortIcon active={sortBy === "ctr"} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row">
                  Aucun mot-cle trouve
                </td>
              </tr>
            ) : (
              paginated.map((keyword, index) => {
                const positionStyle = getPositionStyle(keyword.position);
                return (
                  <tr key={keyword.id} className="kw-row">
                    <td className="kw-num">{(currentPage - 1) * perPage + index + 1}</td>
                    <td className="kw-name">{keyword.keyword}</td>
                    <td>
                      <span className="pos-badge" style={{ background: positionStyle.bg, color: positionStyle.color }}>
                        #{keyword.position}
                      </span>
                    </td>
                    <td className="kw-metric">{keyword.clicks.toLocaleString("fr-FR")}</td>
                    <td className="kw-metric">{keyword.impressions.toLocaleString("fr-FR")}</td>
                    <td>
                      <div className="ctr-wrap">
                        <span className="ctr-val">{keyword.ctr}%</span>
                        <div className="ctr-bar-track">
                          <div
                            className="ctr-bar-fill"
                            style={{ width: `${Math.min(keyword.ctr * 5, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="pagination">
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1}>
            Precedent
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPage(value)}
              className={currentPage === value ? "active" : ""}
            >
              {value}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </button>
        </div>
      ) : null}
    </div>
  );
}

function compareValues(a, b, sortBy, sortDir) {
  const direction = sortDir === "asc" ? 1 : -1;
  const valueA = a[sortBy];
  const valueB = b[sortBy];

  if (typeof valueA === "string" || typeof valueB === "string") {
    return String(valueA).localeCompare(String(valueB), "fr", { sensitivity: "base" }) * direction;
  }

  return (Number(valueA) - Number(valueB)) * direction;
}

function getPositionStyle(position) {
  if (position <= 3) return { bg: "rgba(16,185,129,0.12)", color: "#10B981" };
  if (position <= 10) return { bg: "rgba(99,102,241,0.12)", color: "#A78BFA" };
  if (position <= 20) return { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" };
  return { bg: "rgba(244,63,94,0.12)", color: "#F43F5E" };
}

function SortIcon({ active, dir }) {
  if (!active) return <span className="sort-idle"> +/-</span>;
  return <span className="sort-active">{dir === "asc" ? " asc" : " desc"}</span>;
}
